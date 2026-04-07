import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { runOnJS, withSpring, type SharedValue } from "react-native-reanimated";
import {
  SCREEN_HEIGHT,
  TRAY_SPRING_CONFIG,
} from "../constants";
import { log } from "../logger";

type Params = {
  visible: boolean;
  trayId?: string;
  footer?: ReactNode;
  onCloseComplete?: () => void;
  renderState: {
    state: {
      renderedTrayId?: string;
      renderedFooter?: ReactNode;
    };
    actions: {
      showLatestSnapshot: () => void;
      clear: () => void;
    };
  };
  measurements: {
    shared: {
      measuredFooterHeight: SharedValue<number>;
    };
    state: {
      isReadyToOpen: boolean;
    };
    actions: {
      beginOpenMeasurement: (hasFooter: boolean) => void;
      enableLayout: () => void;
      completePendingOpen: () => void;
      prepareForClose: () => void;
      reset: () => void;
    };
  };
  shared: {
    translateY: SharedValue<number>;
    contentHeight: SharedValue<number>;
    footerHeight: SharedValue<number>;
    active: SharedValue<boolean>;
    animationTravel: SharedValue<number>;
    closeGeneration: SharedValue<number>;
  };
  resolveClosedTranslateY: (nextFooterHeight?: number) => number;
};

export const useActionTrayOpenCloseLifecycle = ({
  visible,
  trayId,
  footer,
  onCloseComplete,
  renderState,
  measurements,
  shared,
  resolveClosedTranslateY,
}: Params) => {
  const justOpenedRef = useRef(false);
  const {
    showLatestSnapshot,
    clear,
  } = renderState.actions;
  const {
    beginOpenMeasurement,
    enableLayout,
    completePendingOpen,
    prepareForClose,
    reset,
  } = measurements.actions;
  const { renderedTrayId, renderedFooter } = renderState.state;
  const { measuredFooterHeight } = measurements.shared;

  const handleCloseSpringFinished = useCallback(() => {
    log("CLOSE SPRING FINISHED — resetting tray state");
    shared.translateY.value = SCREEN_HEIGHT;
    shared.animationTravel.value = SCREEN_HEIGHT;
    clear();
    reset();
    onCloseComplete?.();
  }, [clear, onCloseComplete, reset, shared]);

  const doOpenSpring = useCallback(() => {
    const nextFooterHeight = measuredFooterHeight.value;

    log("doOpenSpring", {
      footer: nextFooterHeight,
      content: shared.contentHeight.value,
    });

    shared.footerHeight.value = nextFooterHeight;

    const openTravel = resolveClosedTranslateY(nextFooterHeight);

    shared.animationTravel.value = openTravel;
    shared.translateY.value = openTravel;

    shared.translateY.value = withSpring(
      0,
      TRAY_SPRING_CONFIG,
      (finished) => {
        if (finished) {
          runOnJS(log)("OPEN SPRING FINISHED");
          runOnJS(enableLayout)();
        }
      },
    );

    shared.active.value = true;
  }, [enableLayout, measuredFooterHeight, resolveClosedTranslateY, shared]);

  useEffect(() => {
    if (visible) {
      shared.translateY.value = SCREEN_HEIGHT;
      shared.closeGeneration.value += 1;
      justOpenedRef.current = true;

      log("OPEN START", {
        trayId,
        footer: measuredFooterHeight.value,
        hadExistingContent: renderedTrayId !== undefined,
        existingTrayId: renderedTrayId,
      });

      showLatestSnapshot();
      beginOpenMeasurement(!!footer);
      log("OPEN — waiting for measurement");
    } else {
      const closeTravel = Math.max(
        resolveClosedTranslateY(),
        shared.translateY.value,
      );

      shared.animationTravel.value = closeTravel;

      log("CLOSE START", {
        renderedTrayId,
        closeTravel,
      });

      const myGeneration = shared.closeGeneration.value + 1;
      shared.closeGeneration.value = myGeneration;

      prepareForClose();
      shared.active.value = false;

      shared.translateY.value = withSpring(
        closeTravel,
        TRAY_SPRING_CONFIG,
        (finished) => {
          if (!finished) {
            return;
          }

          if (shared.closeGeneration.value === myGeneration) {
            runOnJS(handleCloseSpringFinished)();
          } else {
            runOnJS(log)(
              "CLOSE SPRING — stale, skipping reset",
              myGeneration,
              shared.closeGeneration.value,
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
      footer: measuredFooterHeight.value,
      content: shared.contentHeight.value,
      needsFooter: !!renderedFooter,
    });

    completePendingOpen();
    doOpenSpring();
  }, [
    completePendingOpen,
    doOpenSpring,
    measurements.state.isReadyToOpen,
    measuredFooterHeight,
    renderedFooter,
    shared.contentHeight,
  ]);

  return {
    refs: {
      justOpenedRef,
    },
  };
};
