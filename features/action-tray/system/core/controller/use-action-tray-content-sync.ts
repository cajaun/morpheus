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
  resolveIncomingContentHeight: (measuredContentHeight: number) => number;
  restoreContentHeight: (
    trayId: string | undefined,
    measuredContentHeight: number,
  ) => number | undefined;
  onSheetFramePrepared?: (height: number) => void;
};

export const useActionTrayContentSync = ({
  visible,
  interactive,
  rootTrayId,
  trayId,
  fullScreen,
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
  resolveIncomingContentHeight,
  restoreContentHeight,
  onSheetFramePrepared,
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

  // Geometry preparation remains pre-paint, but publishing the incoming React
  // nodes does not belong in this phase. Keeping this effect keyed to live tray
  // identity also prevents rendered snapshot changes from replaying it.
  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    if (justOpenedRef.current) {
      justOpenedRef.current = false;
      return;
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

    if (fullScreen) {
      const incomingHeight = resolveIncomingContentHeightRef.current(
        measuredContentHeight.value,
      );

      log("APPLY INCOMING FULLSCREEN HEIGHT", {
        trayId,
        renderedTrayId,
        measuredContentHeight: measuredContentHeight.value,
        incomingHeight,
        previousContentHeight: contentHeight.value,
      });

      contentHeight.value = incomingHeight;
    } else {
      const restoredContentHeight = restoreContentHeightRef.current(
        trayId,
        measuredContentHeight.value,
      );

      if (renderedFullScreen && restoredContentHeight !== undefined) {
        onSheetFramePreparedRef.current?.(
          restoredContentHeight + measuredFooterHeight.value,
        );
      }
    }
    footerHeight.value = measuredFooterHeight.value;
    setLayoutAnimationEnabled(true);
    // shell level swaps key off tray identity not every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayId, visible, fullScreen]);

  // Visual publication is passive. The commit that installs the new keyed
  // subtree also lets native layout derive the sheet's intrinsic target frame.
  useEffect(() => {
    if (!visible) {
      return;
    }

    if (renderedTrayId === trayId) {
      syncRenderedNodes(trayId);
      return;
    }

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
    interactive,
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
