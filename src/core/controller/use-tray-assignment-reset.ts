import { useRef, type RefObject } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import type { SharedValue } from "react-native-reanimated";
import { SCREEN_HEIGHT } from "../constants";
import { log } from "../logger";

type Params = {
  assignmentId: number;
  // geometry ownership's one reset, shared with a finished close
  resetGeometry: () => void;
  clearRenderState: () => void;
  morphProgress: SharedValue<number>;
  resetMeasurements: () => void;
  shared: {
    active: SharedValue<boolean>;
    animationTravel: SharedValue<number>;
    closeGeneration: SharedValue<number>;
    originProgress: SharedValue<number>;
    originTargetContentHeight: SharedValue<number>;
    surfaceOpacity: SharedValue<number>;
    translateY: SharedValue<number>;
  };
  transition: {
    completedGeneration: SharedValue<number>;
    layoutStartedGeneration: SharedValue<number>;
    startedAt: SharedValue<number>;
    startedGeneration: SharedValue<number>;
    lastHandledLayoutCompletionGenerationRef: RefObject<number>;
  };
};

// assignment reset fences recycled native hosts from earlier transition callbacks
export const useTrayAssignmentReset = ({
  assignmentId,
  resetGeometry,
  clearRenderState,
  morphProgress,
  resetMeasurements,
  shared,
  transition,
}: Params) => {
  const lastResetAssignmentIdRef = useRef(0);
  const {
    active,
    animationTravel,
    closeGeneration,
    originProgress,
    originTargetContentHeight,
    surfaceOpacity,
    translateY,
  } = shared;
  const {
    completedGeneration,
    layoutStartedGeneration,
    startedAt,
    startedGeneration,
    lastHandledLayoutCompletionGenerationRef,
  } = transition;

  useProfiledTrayLayoutEffect("useTrayAssignmentReset.resetAssignment", () => {
    if (
      assignmentId <= 0 ||
      lastResetAssignmentIdRef.current === assignmentId
    ) {
      return;
    }

    lastResetAssignmentIdRef.current = assignmentId;
    log("SLOT ASSIGNMENT RESET", { assignmentId });

    closeGeneration.value += 1;
    translateY.value = SCREEN_HEIGHT;
    animationTravel.value = SCREEN_HEIGHT;
    originProgress.value = 1;
    originTargetContentHeight.value = 0;
    morphProgress.value = 1;
    startedGeneration.value = 0;
    startedAt.value = 0;
    layoutStartedGeneration.value = 0;
    completedGeneration.value = 0;
    lastHandledLayoutCompletionGenerationRef.current = 0;
    surfaceOpacity.value = 0;
    active.value = false;
    clearRenderState();
    resetMeasurements();
    resetGeometry();
  }, [
    assignmentId,
    resetGeometry,
    clearRenderState,
    morphProgress,
    resetMeasurements,
    active,
    animationTravel,
    closeGeneration,
    completedGeneration,
    layoutStartedGeneration,
    lastHandledLayoutCompletionGenerationRef,
    originProgress,
    originTargetContentHeight,
    startedAt,
    startedGeneration,
    surfaceOpacity,
    translateY,
  ]);
};
