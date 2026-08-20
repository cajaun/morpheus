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
import { describeTrayTransition } from "../diagnostics/action-tray-transition-diagnostics";

// this hook decides when new props should update the committed shell snapshot
type Params = {
  visible: boolean;
  interactive: boolean;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
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
  ) => number | undefined;
  readCachedSheetContentHeight?: (trayId?: string) => number | undefined;
  onSheetFramePrepared?: (
    height: number,
    role: "source" | "target",
    trayId?: string,
  ) => void;
  onPrepared?: (details: Record<string, unknown>) => void;
};

export const useActionTrayContentSync = ({
  visible,
  interactive,
  rootTrayId,
  trayId,
  fullScreen,
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
      );

      if (renderedFullScreen && restoredContentHeight !== undefined) {
        // sheet return leases the measured frame until the layout transition finishes
        onSheetFramePreparedRef.current?.(
          restoredContentHeight + nextFooterHeight,
          "target",
          trayId,
        );
      } else if (
        !renderedFullScreen &&
        renderedTransitionContract?.fullScreenChanged === true &&
        renderedTrayId !== trayId
      ) {
        // lease the cached sheet frame after fullscreen return until the incoming step measures
        const cachedContentHeight =
          readCachedSheetContentHeightRef.current?.(trayId);

        if (cachedContentHeight !== undefined) {
          onSheetFramePreparedRef.current?.(
            cachedContentHeight + nextFooterHeight,
            "target",
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
    // shell level swaps key off tray identity not every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayId, visible, fullScreen, morphProgress, onPrepared]);

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
    rootTrayId,
    renderedTrayId,
    showLatestSnapshot,
    syncRenderedNodes,
    trayId,
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
