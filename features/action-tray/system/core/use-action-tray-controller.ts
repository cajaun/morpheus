import React, {
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import { type SharedValue } from "react-native-reanimated";
import { log } from "./logger";
import { useActionTrayContentSync } from "./controller/use-action-tray-content-sync";
import { useActionTrayHeightCache } from "./controller/use-action-tray-height-cache";
import { useActionTrayMeasurements } from "./controller/use-action-tray-measurements";
import { useActionTrayOpenCloseLifecycle } from "./controller/use-action-tray-open-close-lifecycle";
import { useActionTrayPresentationState } from "./controller/use-action-tray-presentation-state";
import { useActionTrayRenderState } from "./controller/use-action-tray-render-state";

type Params = {
  visible: boolean;
  interactive?: boolean;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  keyboardHeight: SharedValue<number>;
  dismissKeyboard: () => void;
  onClose: () => void;
};

export const useActionTrayController = ({
  visible,
  interactive = true,
  content,
  footer,
  onCloseComplete,
  rootTrayId,
  trayId,
  fullScreen,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  keyboardHeight,
  dismissKeyboard,
  onClose,
}: Params) => {
  const renderState = useActionTrayRenderState({
    content,
    footer,
    trayId,
    fullScreen,
    fullScreenDraggable,
    containerStyle,
    className,
    footerStyle,
    footerClassName,
  });

  const presentationFullScreen = renderState.state.renderedFullScreen;

  const presentation = useActionTrayPresentationState({
    visible,
    renderedFooter: renderState.state.renderedFooter,
    presentationFullScreen,
    keyboardHeight,
  });

  const heightCache = useActionTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
  });

  const measurements = useActionTrayMeasurements({
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedFooter: renderState.state.renderedFooter,
    resolveContentHeight: presentation.helpers.resolveRenderedContentHeight,
    onContentHeightResolved: heightCache.actions.handleContentHeightResolved,
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (measurements.shared.measuredContentHeight.value <= 0) {
      return;
    }

    presentation.shared.contentHeight.value =
      presentation.helpers.resolveRenderedContentHeight(
        measurements.shared.measuredContentHeight.value,
      );
  }, [
    measurements.shared.measuredContentHeight,
    presentation.helpers.resolveRenderedContentHeight,
    presentation.shared.contentHeight,
    visible,
  ]);

  const openCloseLifecycle = useActionTrayOpenCloseLifecycle({
    visible,
    rootTrayId,
    trayId,
    footer,
    onCloseComplete,
    renderState,
    measurements,
    shared: {
      translateY: presentation.shared.translateY,
      contentHeight: presentation.shared.contentHeight,
      footerHeight: presentation.shared.footerHeight,
      active: presentation.shared.active,
      animationTravel: presentation.shared.animationTravel,
      closeGeneration: presentation.shared.closeGeneration,
      surfaceOpacity: presentation.shared.surfaceOpacity,
    },
    resolveClosedTranslateY: presentation.helpers.resolveClosedTranslateY,
  });

  useActionTrayContentSync({
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
    justOpenedRef: openCloseLifecycle.refs.justOpenedRef,
    measurements,
    renderState,
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    restoreContentHeight: heightCache.actions.restoreContentHeight,
  });

  const handleRequestClose = useCallback(() => {
    dismissKeyboard();
    onClose?.();
  }, [dismissKeyboard, onClose]);

  const imperativeApi = useMemo(
    () => ({
      open: () => {
        log("imperative open() requested");
      },
      close: () => {
        handleRequestClose();
      },
      isActive: () => !!presentation.shared.active.value,
    }),
    [handleRequestClose, presentation.shared.active],
  );

  return {
    shared: {
      translateY: presentation.shared.translateY,
      contentHeight: presentation.shared.contentHeight,
      footerHeight: presentation.shared.footerHeight,
      active: presentation.shared.active,
      context: presentation.shared.context,
      hasFooter: presentation.shared.hasFooter,
      surfaceOpacity: presentation.shared.surfaceOpacity,
      totalHeight: presentation.shared.totalHeight,
      progress: presentation.shared.progress,
    },
    state: {
      layoutEnabled: measurements.state.layoutEnabled,
      footerMeasured: measurements.state.footerMeasured,
      contentMeasured: measurements.state.contentMeasured,
      pendingOpen: measurements.state.pendingOpen,
      isSurfaceReady: openCloseLifecycle.state.isSurfaceReady,
      renderedFooter: renderState.state.renderedFooter,
      renderedContent: renderState.state.renderedContent,
      renderedTrayId: renderState.state.renderedTrayId,
      renderedFullScreen: renderState.state.renderedFullScreen,
      renderedFullScreenDraggable:
        renderState.state.renderedFullScreenDraggable,
      renderedContainerStyle: renderState.state.renderedContainerStyle,
      renderedClassName: renderState.state.renderedClassName,
      renderedFooterStyle: renderState.state.renderedFooterStyle,
      renderedFooterClassName: renderState.state.renderedFooterClassName,
      measureFooter: measurements.state.shouldMeasureFooter
        ? renderState.state.renderedFooter
        : null,
    },
    handlers: {
      ...measurements.handlers,
      handleRequestClose,
    },
    imperativeApi,
  };
};
