import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import { type SharedValue } from "react-native-reanimated";
import { log } from "./logger";
import { SCREEN_HEIGHT, TRAY_KEYBOARD_GAP } from "./constants";
import { KeyboardTransitionMode } from "./action-tray-types";
import { useActionTrayContentSync } from "./controller/use-action-tray-content-sync";
import { useActionTrayHeightCache } from "./controller/use-action-tray-height-cache";
import { useActionTrayMeasurements } from "./controller/use-action-tray-measurements";
import { useActionTrayOpenCloseLifecycle } from "./controller/use-action-tray-open-close-lifecycle";
import { useActionTrayPresentationState } from "./controller/use-action-tray-presentation-state";
import { useActionTrayRenderState } from "./controller/use-action-tray-render-state";

// this hook is the boundary between tray policy and tray rendering
// it composes measurement lifecycle rendering and presentation state
type Params = {
  assignmentId?: number;
  visible: boolean;
  interactive?: boolean;
  keyboardTransitionMode?: KeyboardTransitionMode;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenSafeAreaTop?: boolean;
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
  assignmentId = 0,
  visible,
  interactive = true,
  keyboardTransitionMode = "idle",
  header,
  content,
  footer,
  onCloseComplete,
  rootTrayId,
  trayId,
  fullScreen,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  keyboardHeight,
  dismissKeyboard,
  onClose,
}: Params) => {
  const lastResetAssignmentIdRef = useRef(0);
  // rendered state is a snapshot so the shell can animate while props keep changing
  const renderState = useActionTrayRenderState({
    content,
    header,
    footer,
    trayId,
    fullScreen,
    fullScreenSafeAreaTop,
    fullScreenDraggable,
    containerStyle,
    className,
    footerStyle,
    footerClassName,
  });

  const presentationFullScreen = renderState.state.renderedFullScreen;
  const isEnteringFullScreen = !!fullScreen && !presentationFullScreen;

  // presentation owns the shared values read by gestures animations and layout
  const presentation = useActionTrayPresentationState({
    visible,
    renderedFooter: renderState.state.renderedFooter,
    presentationFullScreen,
    keyboardHeight,
  });

  const resolveMeasuredContentHeight = useCallback(
    (measuredHeight: number) => {
      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;

      if (!isEnteringFullScreen) {
        const resolvedHeight =
          presentation.helpers.resolveRenderedContentHeight(measuredHeight);

        log("RESOLVE CONTENT HEIGHT", {
          trayId,
          measuredHeight,
          resolvedHeight,
          visible,
          incomingFullScreen: !!fullScreen,
          renderedFullScreen: presentationFullScreen,
          isEnteringFullScreen,
          footerHeight: presentation.shared.footerHeight.value,
          keyboardInset,
          mode: "rendered-presentation",
        });

        return resolvedHeight;
      }

      const resolvedHeight = Math.max(
        0,
        SCREEN_HEIGHT - presentation.shared.footerHeight.value - keyboardInset,
      );

      log("RESOLVE CONTENT HEIGHT", {
        trayId,
        measuredHeight,
        resolvedHeight,
        visible,
        incomingFullScreen: !!fullScreen,
        renderedFullScreen: presentationFullScreen,
        isEnteringFullScreen,
        footerHeight: presentation.shared.footerHeight.value,
        keyboardInset,
        mode: "entering-fullscreen",
      });

      return resolvedHeight;
    },
    [
      isEnteringFullScreen,
      keyboardHeight,
      fullScreen,
      presentation.helpers.resolveRenderedContentHeight,
      presentationFullScreen,
      presentation.shared.footerHeight,
      trayId,
      visible,
    ],
  );

  const heightCache = useActionTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
  });

  // measurements gate the first open spring until geometry is known
  const measurements = useActionTrayMeasurements({
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedFooter: renderState.state.renderedFooter,
    resolveContentHeight: resolveMeasuredContentHeight,
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
      resolveMeasuredContentHeight(measurements.shared.measuredContentHeight.value);
  }, [
    measurements.shared.measuredContentHeight,
    resolveMeasuredContentHeight,
    presentation.shared.contentHeight,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    log("FULLSCREEN TRANSITION STATE", {
      trayId,
      visible,
      incomingFullScreen: !!fullScreen,
      renderedFullScreen: presentationFullScreen,
      isEnteringFullScreen,
      renderedTrayId: renderState.state.renderedTrayId,
      measuredContentHeight: measurements.shared.measuredContentHeight.value,
      resolvedContentHeight: measurements.shared.resolvedContentHeight.value,
      contentHeight: presentation.shared.contentHeight.value,
      footerHeight: presentation.shared.footerHeight.value,
      layoutEnabled: measurements.state.layoutEnabled,
    });
  }, [
    fullScreen,
    isEnteringFullScreen,
    measurements.shared.measuredContentHeight,
    measurements.shared.resolvedContentHeight,
    measurements.state.layoutEnabled,
    presentation.shared.contentHeight,
    presentation.shared.footerHeight,
    presentationFullScreen,
    renderState.state.renderedTrayId,
    trayId,
    visible,
  ]);

  useLayoutEffect(() => {
    if (assignmentId <= 0) {
      return;
    }

    if (lastResetAssignmentIdRef.current === assignmentId) {
      return;
    }

    lastResetAssignmentIdRef.current = assignmentId;

    log("SLOT ASSIGNMENT RESET", {
      assignmentId,
    });

    // host slots are recycled so stale shared values must be cleared on reassignment
    presentation.shared.closeGeneration.value += 1;
    presentation.shared.translateY.value = SCREEN_HEIGHT;
    presentation.shared.animationTravel.value = SCREEN_HEIGHT;
    presentation.shared.surfaceOpacity.value = 0;
    presentation.shared.active.value = false;
    renderState.actions.clear();
    measurements.actions.reset();
  }, [
    assignmentId,
    presentation.shared.active,
    presentation.shared.animationTravel,
    presentation.shared.closeGeneration,
    presentation.shared.surfaceOpacity,
    presentation.shared.translateY,
    measurements.actions.reset,
    renderState.actions.clear,
  ]);

  // lifecycle decides when to open close and reset the shell
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

  // content sync updates the committed snapshot without losing transition continuity
  useActionTrayContentSync({
    visible,
    interactive,
    trayId,
    fullScreen,
    content,
    header,
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
    resolveIncomingContentHeight: resolveMeasuredContentHeight,
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
      // worklets need a shared flag instead of react state to answer this cheaply
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
      renderedHeader: renderState.state.renderedHeader,
      renderedContent: renderState.state.renderedContent,
      renderedTrayId: renderState.state.renderedTrayId,
      renderedFullScreen: renderState.state.renderedFullScreen,
      renderedFullScreenDraggable:
        renderState.state.renderedFullScreenDraggable,
      renderedFullScreenSafeAreaTop:
        renderState.state.renderedFullScreenSafeAreaTop,
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
