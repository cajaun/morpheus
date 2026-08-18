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
import { log } from "../logger";

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
  onSheetFramePrepared?: (height: number) => void;
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
  } =
    renderState.state;
  const { showLatestSnapshot, syncRenderedNodes } = renderState.actions;
  const resolveIncomingContentHeightRef = useRef(resolveIncomingContentHeight);
  resolveIncomingContentHeightRef.current = resolveIncomingContentHeight;

  const restoreContentHeightRef = useRef(restoreContentHeight);
  restoreContentHeightRef.current = restoreContentHeight;

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
      // Preserve source visuals until native geometry starts, then let the
      // canonical layout worklet advance this same value to one.
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
    });

    // Footer layout is detached from the shell and can report zero for one
    // render while the incoming step is being committed. Keep the last stable
    // height so the shell never drops its footer spacer during a boundary.
    const nextFooterHeight =
      measuredFooterHeight.value > 0
        ? measuredFooterHeight.value
        : footerHeight.value;
    footerHeight.value = nextFooterHeight;

    if (fullScreen) {
      if (!renderedFullScreen && contentHeight.value > 0) {
        // Lease the current sheet frame while its intrinsic children hand off
        // to the fullscreen boundary. This blocks transient measurement
        // changes from shrinking the shell before the layout clock starts.
        onSheetFramePreparedRef.current?.(
          contentHeight.value + nextFooterHeight,
        );
      }

      // Do not let the incoming fullscreen measurement resize the source sheet
      // before its snapshot commits. The fullscreen snapshot will resolve this
      // height from its own onLayout after the boundary clock starts.
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
        );
      }
    }
    setLayoutAnimationEnabled(true);
    onPrepared?.({
      trayId,
      fullScreen: !!fullScreen,
      measuredContentHeight: measuredContentHeight.value,
      measuredFooterHeight: measuredFooterHeight.value,
      resolvedContentHeight: contentHeight.value,
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
      // same-key updates can sync nodes without replaying snapshot publication
      syncRenderedNodes(trayId);
      return;
    }

    // key changes publish a new snapshot after pre-paint geometry preparation
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
