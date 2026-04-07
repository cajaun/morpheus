import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  runOnJS,
  runOnUI,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import {
  SCREEN_HEIGHT,
  TRAY_SPRING_CONFIG,
} from "../constants";
import { log } from "../logger";
import {
  markTrayOpenFinished,
  markTrayOpenStarted,
  markTrayReadyToOpen,
} from "../../telemetry/tray-open-timing";

type Params = {
  visible: boolean;
  rootTrayId?: string;
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
    surfaceOpacity: SharedValue<number>;
  };
  resolveClosedTranslateY: (nextFooterHeight?: number) => number;
};

export const useActionTrayOpenCloseLifecycle = ({
  visible,
  rootTrayId,
  trayId,
  footer,
  onCloseComplete,
  renderState,
  measurements,
  shared,
  resolveClosedTranslateY,
}: Params) => {
  const justOpenedRef = useRef(false);
  const [isSurfaceReady, setIsSurfaceReady] = useState(true);
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
    shared.surfaceOpacity.value = 1;
    setIsSurfaceReady(true);
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

    runOnUI(
      (
        nextOpenTravel: number,
        nextFooterHeightValue: number,
      ) => {
        "worklet";

        shared.footerHeight.value = nextFooterHeightValue;
        shared.animationTravel.value = nextOpenTravel;
        shared.translateY.value = nextOpenTravel;
        shared.surfaceOpacity.value = 1;
        shared.active.value = true;

        shared.translateY.value = withSpring(
          0,
          TRAY_SPRING_CONFIG,
          (finished) => {
            if (finished) {
              runOnJS(markTrayOpenFinished)(
                rootTrayId ?? trayId ?? "unknown",
                trayId,
              );
              runOnJS(log)("OPEN SPRING FINISHED");
              runOnJS(enableLayout)();
            }
          },
        );
      }
    )(openTravel, nextFooterHeight);

    setIsSurfaceReady(true);
  }, [enableLayout, measuredFooterHeight, resolveClosedTranslateY, shared]);

  useLayoutEffect(() => {
    if (visible) {
      shared.translateY.value = SCREEN_HEIGHT;
      shared.surfaceOpacity.value = 0;
      shared.closeGeneration.value += 1;
      justOpenedRef.current = true;
      setIsSurfaceReady(false);

      log("OPEN START", {
        trayId,
        footer: measuredFooterHeight.value,
        hadExistingContent: renderedTrayId !== undefined,
        existingTrayId: renderedTrayId,
      });

      markTrayOpenStarted(rootTrayId ?? trayId ?? "unknown", trayId);
      showLatestSnapshot();
      beginOpenMeasurement(!!footer);
      log("OPEN — waiting for measurement");
    } else {
      setIsSurfaceReady(true);
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

    markTrayReadyToOpen(rootTrayId ?? trayId ?? "unknown", trayId);
    completePendingOpen();
    doOpenSpring();
  }, [
    completePendingOpen,
    doOpenSpring,
    measurements.state.isReadyToOpen,
    measuredFooterHeight,
    renderedFooter,
    rootTrayId,
    shared.contentHeight,
    trayId,
  ]);

  return {
    refs: {
      justOpenedRef,
    },
    state: {
      isSurfaceReady,
    },
  };
};
