
import { useAnimatedReaction } from "react-native-reanimated";
import { isTrayDebugLoggingEnabled, log, logWorklet } from "../logger";
import { isTargetSheetMeasurementPending } from "./frame-style-math";
import { type TrayFrameStyleParams } from "./frame-style-params";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

// debug logs of the frame style policy on the JS and UI threads
export const useFrameStylePolicyLog = (
  params: TrayFrameStyleParams,
  hasPreparedSheetFrame: boolean,
) => {
  const {
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreen,
    morphProgress,
    preparedSheetFrame,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  } = params;

  const preparedFrameGeneration = preparedSheetFrame?.generation ?? 0;
  const preparedFrameHeight = preparedSheetFrame?.totalHeight ?? 0;
  const targetSheetMeasurementCandidate =
    fullScreenBoundaryTransition &&
    transitionGeneration !== undefined &&
    transitionGeneration > 0 &&
    fullScreenBoundarySourceFullScreen === true &&
    fullScreenBoundaryTargetFullScreen === false &&
    !hasPreparedSheetFrame;

  useProfiledTrayEffect("core/animation/use-frame-style-policy-log#1", () => {
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("FRAME STYLE POLICY", {
      fullScreen,
      fullScreenBoundaryTransition,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      transitionGeneration,
      transitionSourceKey,
      transitionTargetKey,
      hasPreparedSheetFrame,
      preparedFrameGeneration,
      preparedFrameHeight,
      targetSheetMeasurementCandidate,
      morphProgress: morphProgress.value,
      transitionStartedGeneration: transitionStartedGeneration?.value,
      transitionLayoutStartedGeneration:
        transitionLayoutStartedGeneration?.value,
      transitionCompletedGeneration: transitionCompletedGeneration?.value,
    });
  }, [
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    hasPreparedSheetFrame,
    morphProgress,
    preparedFrameGeneration,
    preparedFrameHeight,
    transitionCompletedGeneration,
    transitionGeneration,
    transitionLayoutStartedGeneration,
    transitionSourceKey,
    transitionStartedGeneration,
    transitionTargetKey,
    targetSheetMeasurementCandidate,
  ]);

  useAnimatedReaction(
    () => ({
      fullScreen: fullScreen ? 1 : 0,
      boundary: fullScreenBoundaryTransition ? 1 : 0,
      transitionGeneration: transitionGeneration ?? 0,
      hasPreparedSheetFrame: hasPreparedSheetFrame ? 1 : 0,
      preparedFrameGeneration,
      preparedFrameHeight,
      targetSheetMeasurementPending: isTargetSheetMeasurementPending({
        fullScreenBoundaryTransition,
        sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
        targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
        transitionGeneration,
        transitionCompletedGeneration:
          transitionCompletedGeneration?.value ?? 0,
        hasPreparedSheetFrame,
      })
        ? 1
        : 0,
      transitionStartedGeneration: transitionStartedGeneration?.value ?? 0,
      transitionLayoutStartedGeneration:
        transitionLayoutStartedGeneration?.value ?? 0,
      transitionCompletedGeneration: transitionCompletedGeneration?.value ?? 0,
    }),
    (state, previous) => {
      if (
        previous &&
        state.fullScreen === previous.fullScreen &&
        state.boundary === previous.boundary &&
        state.transitionGeneration === previous.transitionGeneration &&
        state.hasPreparedSheetFrame === previous.hasPreparedSheetFrame &&
        state.preparedFrameGeneration === previous.preparedFrameGeneration &&
        state.preparedFrameHeight === previous.preparedFrameHeight &&
        state.targetSheetMeasurementPending ===
          previous.targetSheetMeasurementPending &&
        state.transitionStartedGeneration ===
          previous.transitionStartedGeneration &&
        state.transitionLayoutStartedGeneration ===
          previous.transitionLayoutStartedGeneration &&
        state.transitionCompletedGeneration ===
          previous.transitionCompletedGeneration
      ) {
        return;
      }

      logWorklet("FRAME STYLE UI STATE", state);
    },
    [
      fullScreen,
      fullScreenBoundaryTransition,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      hasPreparedSheetFrame,
      preparedFrameGeneration,
      preparedFrameHeight,
      transitionCompletedGeneration,
      transitionGeneration,
      transitionLayoutStartedGeneration,
      transitionStartedGeneration,
    ],
  );
};
