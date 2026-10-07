import {
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { markTrayStepSnapshotPublished } from "../../telemetry/tray-step-timing";
import type { TrayTransitionContract } from "../../runtime/types";
import { log } from "../logger";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import { isKeyboardAwareSheetStepTransition } from "../input/keyboard-transition";

// this hook decides when new props should update the committed shell snapshot
type Params = {
  visible: boolean;
  interactive: boolean;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
  keyboardAware?: boolean;
  transitionContract?: TrayTransitionContract | null;
  fullScreenBackgroundScale?: number;
  content?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  justOpenedRef: RefObject<boolean>;
  measurements: {
    state: {
      layoutEnabled: boolean;
    };
    actions: {
      setLayoutAnimationEnabled: (enabled: boolean) => void;
    };
    shared: {
      measuredContentHeight: SharedValue<number>;
      measuredFooterHeight: SharedValue<number>;
    };
  };
  renderState: {
    state: {
      renderedTrayId?: string;
      renderedContent: ReactNode;
      renderedHeader: ReactNode;
      renderedFooter: ReactNode;
      renderedFullScreen: boolean;
      renderedTransitionContract: TrayTransitionContract | null;
    };
    actions: {
      showLatestSnapshot: () => void;
      syncRenderedNodes: (activeTrayId?: string) => void;
    };
  };
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;
  morphProgress: SharedValue<number>;
  resolveIncomingContentHeight: (measuredContentHeight: number) => number;
  restoreContentHeight: (
    trayId: string | undefined,
    measuredContentHeight: number,
    mode?: "sheet" | "fullScreen",
    allowMeasuredFallback?: boolean,
  ) => number | undefined;
  readCachedSheetContentHeight?: (trayId?: string) => number | undefined;
  onSheetFramePrepared?: (
    height: number,
    role: "source" | "target",
    contentHeight: number,
    trayId?: string,
  ) => void;
  onPrepared?: (details: Record<string, unknown>) => void;
};

// decide when incoming props can replace the committed shell snapshot
export const useTrayContentSync = ({
  visible,
  interactive,
  rootTrayId,
  trayId,
  fullScreen,
  keyboardAware,
  transitionContract,
  fullScreenBackgroundScale,
  content,
  header,
  footer,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  justOpenedRef,
  measurements,
  renderState,
  contentHeight,
  footerHeight,
  morphProgress,
  resolveIncomingContentHeight,
  restoreContentHeight,
  readCachedSheetContentHeight,
  onSheetFramePrepared,
  onPrepared,
}: Params) => {
  const { layoutEnabled } = measurements.state;
  const { setLayoutAnimationEnabled } = measurements.actions;
  const { measuredContentHeight, measuredFooterHeight } = measurements.shared;
  const {
    renderedTrayId,
    renderedContent,
    renderedHeader,
    renderedFooter,
    renderedFullScreen,
    renderedTransitionContract,
  } =
    renderState.state;
  const { showLatestSnapshot, syncRenderedNodes } = renderState.actions;
  const resolveIncomingContentHeightRef = useRef(resolveIncomingContentHeight);
  resolveIncomingContentHeightRef.current = resolveIncomingContentHeight;

  const restoreContentHeightRef = useRef(restoreContentHeight);
  restoreContentHeightRef.current = restoreContentHeight;

  const readCachedSheetContentHeightRef = useRef(
    readCachedSheetContentHeight,
  );
  readCachedSheetContentHeightRef.current = readCachedSheetContentHeight;

  const onSheetFramePreparedRef = useRef(onSheetFramePrepared);
  onSheetFramePreparedRef.current = onSheetFramePrepared;

  // Sheet keyboard handoffs publish the incoming snapshot before paint. The
  // passive effect below then only clears the latch instead of publishing a
  // second copy of the same snapshot.
  const keyboardSnapshotPublishedRef = useRef<string | undefined>(undefined);

  // prepare geometry before paint without publishing incoming react nodes
  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    if (justOpenedRef.current) {
      // first open already prepared geometry through measurement callbacks
      justOpenedRef.current = false;
      return;
    }

    if (renderedTrayId !== trayId || renderedFullScreen !== !!fullScreen) {
      // preserve source visuals until native geometry starts then let the canonical layout worklet advance this same value to one
      morphProgress.value = 0;
    }

    log("TRAY CHANGE", {
      trayId,
      renderedTrayId,
      incomingFullScreen: !!fullScreen,
      renderedFullScreen,
      measuredContentHeight: measuredContentHeight.value,
      measuredFooterHeight: measuredFooterHeight.value,
      contentHeight: contentHeight.value,
      footerHeight: footerHeight.value,
      layoutEnabled,
      preparesFullScreen: !!fullScreen,
      morphProgress: morphProgress.value,
      renderedTransition: describeTrayTransition(renderedTransitionContract),
    });

    // retain the last footer height when detached layout briefly reports zero during a boundary
    const nextFooterHeight =
      measuredFooterHeight.value > 0
        ? measuredFooterHeight.value
        : footerHeight.value;
    footerHeight.value = nextFooterHeight;

    if (fullScreen) {
      if (!renderedFullScreen && contentHeight.value > 0) {
        // lease the sheet frame while children hand off so transient measurements cannot shrink the shell
        onSheetFramePreparedRef.current?.(
          contentHeight.value + nextFooterHeight,
          "source",
          contentHeight.value,
          renderedTrayId,
        );
      }

      // defer fullscreen measurement until its snapshot commits and the boundary clock starts
      const incomingHeight = resolveIncomingContentHeightRef.current(
        measuredContentHeight.value,
      );

      log("PREPARE INCOMING FULLSCREEN HEIGHT", {
        trayId,
        renderedTrayId,
        measuredContentHeight: measuredContentHeight.value,
        incomingHeight,
        applied: renderedFullScreen,
        previousContentHeight: contentHeight.value,
        morphProgress: morphProgress.value,
        renderedTransition: describeTrayTransition(renderedTransitionContract),
      });

      if (renderedFullScreen) {
        contentHeight.value = incomingHeight;
      }
    } else {
      const restoredContentHeight = restoreContentHeightRef.current(
        trayId,
        measuredContentHeight.value,
        "sheet",
        // a fullscreen source measurement is a viewport constraint, never a valid fallback for a new sheet endpoint
        !renderedFullScreen,
      );

      if (renderedFullScreen && restoredContentHeight !== undefined) {
        // sheet return leases the measured frame until the layout transition finishes
        onSheetFramePreparedRef.current?.(
          restoredContentHeight + nextFooterHeight,
          "target",
          restoredContentHeight,
          trayId,
        );
      } else if (!renderedFullScreen && renderedTrayId !== trayId) {
        // promote cached target height before publishing the sheet handoff
        const cachedContentHeight =
          readCachedSheetContentHeightRef.current?.(trayId);

        if (cachedContentHeight !== undefined) {
          contentHeight.value = cachedContentHeight;
          onSheetFramePreparedRef.current?.(
            cachedContentHeight + nextFooterHeight,
            "target",
            cachedContentHeight,
            trayId,
          );
        }
      }
    }
    setLayoutAnimationEnabled(true);
    onPrepared?.({
      trayId,
      fullScreen: !!fullScreen,
      measuredContentHeight: measuredContentHeight.value,
      measuredFooterHeight: measuredFooterHeight.value,
      resolvedContentHeight: contentHeight.value,
      morphProgress: morphProgress.value,
      renderedTransition: describeTrayTransition(renderedTransitionContract),
    });
    // shell level swaps key off tray identity not every prop change eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayId, visible, fullScreen, morphProgress, onPrepared]);

  useLayoutEffect(() => {
    if (
      !visible ||
      renderedTrayId === trayId ||
      !isKeyboardAwareSheetStepTransition(transitionContract)
    ) {
      return;
    }

    keyboardSnapshotPublishedRef.current = trayId;
    markTrayStepSnapshotPublished(rootTrayId, trayId);
    showLatestSnapshot();
  }, [
    renderedTrayId,
    rootTrayId,
    showLatestSnapshot,
    trayId,
    transitionContract,
    visible,
  ]);

  // publish visual content after native layout can derive the sheet frame
  useEffect(() => {
    if (!visible) {
      return;
    }

    if (renderedTrayId === trayId) {
      // same key updates can sync nodes without replaying snapshot publication
      syncRenderedNodes(trayId);
      return;
    }

    if (keyboardSnapshotPublishedRef.current === trayId) {
      keyboardSnapshotPublishedRef.current = undefined;
      return;
    }

    // key changes publish a new snapshot after pre paint geometry preparation
    markTrayStepSnapshotPublished(rootTrayId, trayId);
    showLatestSnapshot();
  }, [
    className,
    containerStyle,
    content,
    header,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
    fullScreenBackgroundScale,
    keyboardAware,
    rootTrayId,
    renderedTrayId,
    showLatestSnapshot,
    syncRenderedNodes,
    trayId,
    transitionContract,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    log("LIVE STEP PROPS", {
      trayId,
      hasContent: content != null,
      hasFooter: footer != null,
      hasHeader: header != null,
      incomingFullScreen: fullScreen,
      fullScreenBackgroundScale,
      renderedFullScreen,
      hasContainerStyle: containerStyle != null,
      hasFooterStyle: footerStyle != null,
      className,
      footerClassName,
      interactive,
    });
  }, [
    className,
    containerStyle,
    content,
    header,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
    fullScreenBackgroundScale,
    interactive,
    renderedFullScreen,
    trayId,
    visible,
  ]);

  useEffect(() => {
    log("RENDERED CONTENT CHANGED", {
      trayId: renderedTrayId,
      hasContent: renderedContent !== null,
      hasFooter: renderedFooter !== null,
      hasHeader: renderedHeader !== null,
      fullScreen: renderedFullScreen,
    });
  }, [
    renderedContent,
    renderedFooter,
    renderedHeader,
    renderedFullScreen,
    renderedTrayId,
  ]);
};
