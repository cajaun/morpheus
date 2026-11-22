import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import {
  runOnUI,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  EXPAND_FROM_TRIGGER_CLOSE_DURATION,
  EXPAND_FROM_TRIGGER_OPEN_DURATION,
  SCREEN_HEIGHT,
  TRAY_SPRING_CONFIG,
} from "../constants";
import {
  isTrayDebugLoggingEnabled,
  log,
  logWorklet,
} from "../logger";
import {
  markTrayOpenFinished,
  markTrayOpenStarted,
  markTrayReadyToOpen,
} from "../../telemetry/tray-open-timing";
import type { TrayLifecycleParams } from "./tray-lifecycle-types";
import {
  resolveTrayCloseTravel,
  resolveTrayOpenTravel,
} from "./tray-lifecycle-motion";

type Params = TrayLifecycleParams;

// opening and closing springs coordinated with measurement and lifecycle state
export const useTrayOpenCloseLifecycle = ({
  visible,
  rootTrayId,
  trayId,
  footer,
  onCloseComplete,
  renderState,
  measurements,
  shared,
  resolveClosedTranslateY,
  transition,
  onTransitionPrepared,
  onTransitionCommitted,
  onTransitionStarted,
  onTransitionCompleted,
  originGeometryLeaseRef,
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
  const { measuredFooterHeight, resolvedContentHeight } = measurements.shared;
  const { latestMeasuredFooterHeightRef, latestResolvedContentHeightRef } =
    measurements.refs;

  const handleCloseSpringFinished = useCallback(() => {
    log("CLOSE SPRING FINISHED — resetting tray state");
    // reset every animated value so a recycled host starts from the same baseline
    shared.translateY.value = SCREEN_HEIGHT;
    shared.animationTravel.value = SCREEN_HEIGHT;
    shared.surfaceOpacity.value = 1;
    shared.originProgress.value = 1;
    shared.originTargetContentHeight.value = 0;
    originGeometryLeaseRef.current = false;
    setIsSurfaceReady(true);
    clear();
    reset();
    onTransitionCompleted?.({ owner: "tray-close" });
    onCloseComplete?.();
  }, [
    clear,
    onCloseComplete,
    onTransitionCompleted,
    originGeometryLeaseRef,
    reset,
    shared,
  ]);

  const handleOpenTransitionCompleted = useCallback(() => {
    onTransitionCompleted?.({ owner: "tray-open" });
  }, [onTransitionCompleted]);

  const releaseOriginGeometryLease = useCallback(() => {
    originGeometryLeaseRef.current = false;
  }, [originGeometryLeaseRef]);

  const doOpenSpring = useCallback(() => {
    // refs instead of React state because layout callbacks land between renders
    const nextFooterHeight =
      latestMeasuredFooterHeightRef.current > 0
        ? latestMeasuredFooterHeightRef.current
        : measuredFooterHeight.value;
    const nextContentHeight =
      latestResolvedContentHeightRef.current > 0
        ? latestResolvedContentHeightRef.current
        : resolvedContentHeight.value > 0
          ? resolvedContentHeight.value
        : shared.contentHeight.value;

    log("doOpenSpring", {
      footer: nextFooterHeight,
      content: nextContentHeight,
    });

    shared.contentHeight.value = nextContentHeight;
    shared.footerHeight.value = nextFooterHeight;

    const openTravel = resolveTrayOpenTravel(
      resolveClosedTranslateY,
      nextFooterHeight,
      nextContentHeight,
    );

    const shouldExpandFromTrigger =
      transition?.open === "expandFromTrigger";

    // capture origin geometry before its clock can expose transient layouts
    shared.originTargetContentHeight.value = shouldExpandFromTrigger
      ? nextContentHeight
      : 0;
    originGeometryLeaseRef.current = shouldExpandFromTrigger;

    onTransitionStarted?.({ owner: "tray-open" });

    // the UI thread spring owns the visible open from travel to zero
    runOnUI(
      (
        nextOpenTravel: number,
        nextFooterHeightValue: number,
        expandFromTrigger: boolean,
      ) => {
        "worklet";

        shared.footerHeight.value = nextFooterHeightValue;
        shared.animationTravel.value = nextOpenTravel;
        // trigger expansion starts at translate zero and reveals through origin progress
        shared.translateY.value = expandFromTrigger ? 0 : nextOpenTravel;
        shared.originProgress.value = expandFromTrigger ? 0 : 1;
        shared.surfaceOpacity.value = 1;
        shared.active.value = true;

        if (expandFromTrigger) {
          // a trigger-origin open keeps explicit geometry until a later sheet change takes layout ownership
          shared.originProgress.value = withTiming(
            1,
            { duration: EXPAND_FROM_TRIGGER_OPEN_DURATION },
            (finished) => {
              if (finished) {
                scheduleOnRN(releaseOriginGeometryLease);
                scheduleOnRN(
                  markTrayOpenFinished,
                  rootTrayId ?? trayId ?? "unknown",
                  trayId,
                );
                logWorklet("EXPAND OPEN FINISHED");
                scheduleOnRN(handleOpenTransitionCompleted);
              }
            },
          );
          return;
        }

        shared.translateY.value = withSpring(
          0,
          TRAY_SPRING_CONFIG,
          (finished) => {
            if (finished) {
              // a normal sheet open enables later morphs once the travel spring lands
              scheduleOnRN(
                markTrayOpenFinished,
                rootTrayId ?? trayId ?? "unknown",
                trayId,
              );
              logWorklet("OPEN SPRING FINISHED");
              scheduleOnRN(enableLayout);
              scheduleOnRN(handleOpenTransitionCompleted);
            }
          },
        );
      }
    )(openTravel, nextFooterHeight, shouldExpandFromTrigger);

    setIsSurfaceReady(true);
  }, [
    enableLayout,
    handleOpenTransitionCompleted,
    latestMeasuredFooterHeightRef,
    latestResolvedContentHeightRef,
    measuredFooterHeight,
    rootTrayId,
    resolveClosedTranslateY,
    resolvedContentHeight,
    shared,
    trayId,
    transition?.open,
    onTransitionStarted,
    originGeometryLeaseRef,
    releaseOriginGeometryLease,
  ]);

  useProfiledTrayLayoutEffect("useTrayOpenCloseLifecycle.visibility", () => {
    if (visible) {
      // hide the shell until the geometry that defines the spring travel is known
      shared.translateY.value = SCREEN_HEIGHT;
      shared.originProgress.value =
        transition?.open === "expandFromTrigger" ? 0 : 1;
      shared.surfaceOpacity.value = 0;
      shared.closeGeneration.value += 1;
      justOpenedRef.current = true;
      setIsSurfaceReady(false);

      if (isTrayDebugLoggingEnabled()) {
        log("OPEN START", {
          trayId,
          footer: measuredFooterHeight.value,
          hadExistingContent: renderedTrayId !== undefined,
          existingTrayId: renderedTrayId,
        });
      }

      markTrayOpenStarted(rootTrayId ?? trayId ?? "unknown", trayId);
      showLatestSnapshot();
      // measurement restarts after snapshot publication because content identity may change
      beginOpenMeasurement(!!footer);
      if (isTrayDebugLoggingEnabled()) {
        log("OPEN — waiting for measurement");
      }
    } else {
      setIsSurfaceReady(true);
      // closing is a terminal snapshot boundary, so commit the latest props before the shell moves and the previous step cannot reappear
      showLatestSnapshot();
      // close travel covers at least the current drag offset
      const currentTranslateY = shared.translateY.value;
      const closeTravel = resolveTrayCloseTravel(
        resolveClosedTranslateY,
        currentTranslateY,
      );

      shared.animationTravel.value = closeTravel;

      if (isTrayDebugLoggingEnabled()) {
        log("CLOSE START", {
          renderedTrayId,
          closeTravel,
        });
      }

      const myGeneration = shared.closeGeneration.value + 1;
      shared.closeGeneration.value = myGeneration;

      onTransitionPrepared?.({ owner: "tray-close", closeTravel });
      onTransitionCommitted?.({ owner: "tray-close" });
      onTransitionStarted?.({ owner: "tray-close" });

      // generation ids stop an old close callback from clearing a newer open
      prepareForClose();
      shared.active.value = false;

      const shouldReverseExpand =
        transition?.close === "collapseToTrigger" &&
        transition?.open === "expandFromTrigger" &&
        currentTranslateY < 8;

      if (shouldReverseExpand) {
        // reverse the origin progress instead of a vertical close spring
        shared.translateY.value = 0;
        shared.originProgress.value = withTiming(
          0,
          { duration: EXPAND_FROM_TRIGGER_CLOSE_DURATION },
          (finished) => {
            if (!finished) {
              return;
            }

            if (shared.closeGeneration.value === myGeneration) {
              scheduleOnRN(handleCloseSpringFinished);
            } else {
              logWorklet(
                "COLLAPSE CLOSE — stale, skipping reset",
                {
                  generation: myGeneration,
                  currentGeneration: shared.closeGeneration.value,
                },
              );
            }
          },
        );
        return;
      }

      shared.originProgress.value = 1;
      shared.translateY.value = withSpring(
        closeTravel,
        TRAY_SPRING_CONFIG,
        (finished) => {
          if (!finished) {
            return;
          }

          if (shared.closeGeneration.value === myGeneration) {
            scheduleOnRN(handleCloseSpringFinished);
          } else {
            logWorklet(
              "CLOSE SPRING — stale, skipping reset",
              {
                generation: myGeneration,
                currentGeneration: shared.closeGeneration.value,
              },
            );
          }
        },
      );
    }
    // visibility bounds open and close work
  }, [visible]);

  useEffect(() => {
    if (!measurements.state.isReadyToOpen) {
      return;
    }

    // open once the shell knows enough to avoid a snap after paint
    log("PENDING OPEN — all measurements ready", {
      footer:
        latestMeasuredFooterHeightRef.current > 0
          ? latestMeasuredFooterHeightRef.current
          : measuredFooterHeight.value,
      content:
        latestResolvedContentHeightRef.current > 0
          ? latestResolvedContentHeightRef.current
          : resolvedContentHeight.value > 0
            ? resolvedContentHeight.value
          : shared.contentHeight.value,
      needsFooter: !!renderedFooter,
    });

    markTrayReadyToOpen(rootTrayId ?? trayId ?? "unknown", trayId);
    onTransitionPrepared?.({
      owner: "tray-open",
      contentHeight:
        latestResolvedContentHeightRef.current ||
        resolvedContentHeight.value,
      footerHeight:
        latestMeasuredFooterHeightRef.current || measuredFooterHeight.value,
    });
    onTransitionCommitted?.({ owner: "tray-open" });
    completePendingOpen();
    doOpenSpring();
  }, [
    completePendingOpen,
    doOpenSpring,
    latestMeasuredFooterHeightRef,
    latestResolvedContentHeightRef,
    measurements.state.isReadyToOpen,
    measuredFooterHeight,
    onTransitionPrepared,
    onTransitionCommitted,
    resolvedContentHeight,
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
