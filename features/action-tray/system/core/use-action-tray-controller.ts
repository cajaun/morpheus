import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SCREEN_HEIGHT,
  TRAY_KEYBOARD_GAP,
  TRAY_SPRING_CONFIG,
} from "./constants";
import { log } from "./logger";
import { useActionTrayMeasurements } from "./use-action-tray-measurements";
import { useActionTrayRenderState } from "./use-action-tray-render-state";

type Params = {
  visible: boolean;
  content?: React.ReactNode;
  footer?: React.ReactNode;
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
  content,
  footer,
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
  const { bottom } = useSafeAreaInsets();
  const contentHeightCacheRef = useRef<Record<string, number>>({});


  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contentHeight = useSharedValue(0);
  const footerHeight = useSharedValue(0);
  const active = useSharedValue(false);
  const context = useSharedValue({ y: 0 });
  const hasFooter = useSharedValue(false);
  const closeGeneration = useSharedValue(0);
  const animationTravel = useSharedValue(SCREEN_HEIGHT);

  const justOpenedRef = useRef(false);

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

  const resolveRenderedContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!presentationFullScreen) {
        return measuredHeight;
      }

      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;

      return Math.max(
        0,
        SCREEN_HEIGHT - footerHeight.value - keyboardInset,
      );
    },
    [footerHeight, keyboardHeight, presentationFullScreen],
  );

  const measurements = useActionTrayMeasurements({
    contentHeight,
    footerHeight,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedFooter: renderState.state.renderedFooter,
    resolveContentHeight: resolveRenderedContentHeight,
    onContentHeightResolved: (resolvedHeight, _measuredHeight, nextTrayId) => {


      if (!nextTrayId) {
        return;
      }

      contentHeightCacheRef.current[nextTrayId] = resolvedHeight;
    },
  });

  useEffect(() => {
    hasFooter.value = !!renderState.state.renderedFooter;
  }, [hasFooter, renderState.state.renderedFooter]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (measurements.shared.measuredContentHeight.value <= 0) {
      return;
    }


    contentHeight.value = resolveRenderedContentHeight(
      measurements.shared.measuredContentHeight.value,
    );
  }, [
    contentHeight,
    measurements.shared.measuredContentHeight,
    resolveRenderedContentHeight,
    visible,
  ]);

  const totalHeight = useDerivedValue(() => {
    if (presentationFullScreen) {
      return SCREEN_HEIGHT;
    }

    const keyboardInset =
      keyboardHeight.value > 0
        ? keyboardHeight.value + TRAY_KEYBOARD_GAP
        : 0;
    const trayBottomInset = Math.max(bottom, keyboardInset);

    return contentHeight.value + footerHeight.value + trayBottomInset;
  }, [bottom, keyboardHeight, presentationFullScreen]);

  const resolveClosedTranslateY = useCallback(
    (nextFooterHeight = footerHeight.value) => {
      if (presentationFullScreen) {
        return SCREEN_HEIGHT;
      }

      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;
      const trayBottomInset = Math.max(bottom, keyboardInset);

      return contentHeight.value + nextFooterHeight + trayBottomInset;
    },
    [bottom, contentHeight, footerHeight, keyboardHeight, presentationFullScreen],
  );

  const progress = useDerivedValue(() => {
    if (animationTravel.value <= 0) {
      return 0;
    }

    const travel = Math.min(
      Math.max(translateY.value, 0),
      animationTravel.value,
    );

    return 1 - travel / animationTravel.value;
  });

  useAnimatedReaction(
    () => {
      if (!visible) {
        return -1;
      }

      if (Math.abs(translateY.value) > 0.5) {
        return -1;
      }

      return totalHeight.value;
    },
    (nextTravel, previousTravel) => {
      if (nextTravel > 0 && nextTravel !== previousTravel) {
        animationTravel.value = nextTravel;
      }
    },
    [visible],
  );

  const doOpenSpring = useCallback(() => {
    const measuredFooterHeight = measurements.shared.measuredFooterHeight.value;

    log("doOpenSpring", {
      footer: measuredFooterHeight,
      content: contentHeight.value,
    });

    footerHeight.value = measuredFooterHeight;

    const openTravel = resolveClosedTranslateY(measuredFooterHeight);

    animationTravel.value = openTravel;
    translateY.value = openTravel;

    translateY.value = withSpring(0, TRAY_SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(log)("OPEN SPRING FINISHED");
        runOnJS(measurements.actions.enableLayout)();
      }
    });

    active.value = true;
  }, [
    active,
    animationTravel,
    contentHeight,
    footerHeight,
    measurements.actions.enableLayout,
    measurements.shared.measuredFooterHeight,
    resolveClosedTranslateY,
    translateY,
  ]);

  const handleCloseSpringFinished = useCallback(() => {
    log("CLOSE SPRING FINISHED — resetting tray state");
    translateY.value = SCREEN_HEIGHT;
    animationTravel.value = SCREEN_HEIGHT;
    renderState.actions.clear();
    measurements.actions.reset();
  }, [
    animationTravel,
    measurements.actions.reset,
    renderState.actions.clear,
    translateY,
  ]);

  useEffect(() => {
    if (visible) {
      translateY.value = SCREEN_HEIGHT;
      closeGeneration.value += 1;
      justOpenedRef.current = true;

      log("OPEN START", {
        trayId,
        footer: measurements.shared.measuredFooterHeight.value,
        hadExistingContent: renderState.state.renderedTrayId !== undefined,
        existingTrayId: renderState.state.renderedTrayId,
      });

      renderState.actions.showLatestSnapshot();
      measurements.actions.beginOpenMeasurement(!!footer);
      log("OPEN — waiting for measurement");
    } else {
      const closeTravel = Math.max(resolveClosedTranslateY(), translateY.value);

      animationTravel.value = closeTravel;

      log("CLOSE START", {
        renderedTrayId: renderState.state.renderedTrayId,
        closeTravel,
      });

      const myGeneration = closeGeneration.value + 1;
      closeGeneration.value = myGeneration;

      measurements.actions.prepareForClose();
      active.value = false;

      translateY.value = withSpring(
        closeTravel,
        TRAY_SPRING_CONFIG,
        (finished) => {
          if (!finished) {
            return;
          }

          if (closeGeneration.value === myGeneration) {
            runOnJS(handleCloseSpringFinished)();
          } else {
            runOnJS(log)(
              "CLOSE SPRING — stale, skipping reset",
              myGeneration,
              closeGeneration.value,
            );
          }
        },
      );
    }
    // Visibility changes are the only lifecycle boundary for open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!measurements.state.isReadyToOpen) {
      return;
    }

    log("PENDING OPEN — all measurements ready", {
      footer: measurements.shared.measuredFooterHeight.value,
      content: contentHeight.value,
      needsFooter: !!renderState.state.renderedFooter,
    });

    measurements.actions.completePendingOpen();
    doOpenSpring();
  }, [
    contentHeight,
    doOpenSpring,
    measurements.actions.completePendingOpen,
    measurements.shared.measuredFooterHeight,
    measurements.state.isReadyToOpen,
    renderState.state.renderedFooter,
  ]);

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
      renderedTrayId: renderState.state.renderedTrayId,
      contentHeight: contentHeight.value,
      footerHeight: footerHeight.value,
      layoutEnabled: measurements.state.layoutEnabled,
    });

      if (trayId) {
      const cachedHeight = contentHeightCacheRef.current[trayId];

      if (!fullScreen && cachedHeight != null) {
        contentHeight.value = cachedHeight;
      } else if (measurements.shared.measuredContentHeight.value > 0) {
        contentHeight.value = measurements.shared.measuredContentHeight.value;
      }
    }

    measurements.actions.setLayoutAnimationEnabled(true);
    renderState.actions.showLatestSnapshot();
    // Tray identity changes coordinate the content swap and layout mode together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayId, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    renderState.actions.syncRenderedNodes(trayId);
  }, [
    className,
    containerStyle,
    content,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
    renderState.actions.syncRenderedNodes,
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
    });
  }, [
    className,
    containerStyle,
    content,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
    trayId,
    visible,
  ]);

  useEffect(() => {
    log("RENDERED CONTENT CHANGED", {
      trayId: renderState.state.renderedTrayId,
      hasContent: renderState.state.renderedContent !== null,
      hasFooter: renderState.state.renderedFooter !== null,
      fullScreen: renderState.state.renderedFullScreen,
    });
  }, [
    renderState.state.renderedContent,
    renderState.state.renderedFooter,
    renderState.state.renderedFullScreen,
    renderState.state.renderedTrayId,
  ]);

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
      isActive: () => !!active.value,
    }),
    [active, handleRequestClose],
  );

  return {
    shared: {
      translateY,
      contentHeight,
      footerHeight,
      active,
      context,
      hasFooter,
      totalHeight,
      progress,
    },
    state: {
      layoutEnabled: measurements.state.layoutEnabled,
      footerMeasured: measurements.state.footerMeasured,
      contentMeasured: measurements.state.contentMeasured,
      pendingOpen: measurements.state.pendingOpen,
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
