import { RefObject, useEffect, type ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { log } from "../logger";

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
  restoreContentHeight,
}: Params) => {
  const { layoutEnabled } = measurements.state;
  const { setLayoutAnimationEnabled } = measurements.actions;
  const { measuredContentHeight } = measurements.shared;
  const { renderedTrayId, renderedContent, renderedFooter, renderedFullScreen } =
    renderState.state;
  const { showLatestSnapshot, syncRenderedNodes } = renderState.actions;

  useEffect(() => {
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
      contentHeight: contentHeight.value,
      footerHeight: footerHeight.value,
      layoutEnabled,
    });

    restoreContentHeight(trayId, measuredContentHeight.value);
    setLayoutAnimationEnabled(true);
    showLatestSnapshot();
    // Tray identity changes coordinate the content swap and layout mode together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayId, visible]);

  useEffect(() => {
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
      fullScreen,
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
