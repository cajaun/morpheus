import {
  RefObject,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { log } from "../logger";

// this hook decides when new props should update the committed shell snapshot
type Params = {
  visible: boolean;
  interactive: boolean;
  trayId?: string;
  fullScreen?: boolean;
  content?: ReactNode;
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
  ) => void;
};

export const useActionTrayContentSync = ({
  visible,
  interactive,
  trayId,
  fullScreen,
  content,
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
}: Params) => {
  const { layoutEnabled } = measurements.state;
  const { setLayoutAnimationEnabled } = measurements.actions;
  const { measuredContentHeight, measuredFooterHeight } = measurements.shared;
  const { renderedTrayId, renderedContent, renderedFooter, renderedFullScreen } =
    renderState.state;
  const { showLatestSnapshot, syncRenderedNodes } = renderState.actions;
  const isEnteringFullScreen = !!fullScreen && !renderedFullScreen;

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
      isEnteringFullScreen,
    });

    if (isEnteringFullScreen) {
      const incomingHeight = resolveIncomingContentHeight(
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
      restoreContentHeight(trayId, measuredContentHeight.value);
    }
    footerHeight.value = measuredFooterHeight.value;
    setLayoutAnimationEnabled(true);
    showLatestSnapshot();
    // shell level swaps key off tray identity not every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEnteringFullScreen,
    measuredContentHeight,
    measuredFooterHeight,
    resolveIncomingContentHeight,
    restoreContentHeight,
    setLayoutAnimationEnabled,
    showLatestSnapshot,
    trayId,
    visible,
    footerHeight,
    fullScreen,
    interactive,
    justOpenedRef,
    layoutEnabled,
    renderedFullScreen,
    renderedTrayId,
    contentHeight,
  ]);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    syncRenderedNodes(trayId);
  }, [
    className,
    containerStyle,
    content,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
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
      fullScreen: renderedFullScreen,
    });
  }, [
    renderedContent,
    renderedFooter,
    renderedFullScreen,
    renderedTrayId,
  ]);
};
