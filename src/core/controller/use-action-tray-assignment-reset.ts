import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { SCREEN_HEIGHT } from "../constants";
import { log } from "../logger";
import type { ActionTraySheetFrame } from "../types/action-tray";

type Params = {
  assignmentId: number;
  clearPreparedSheetFrame: () => void;
  clearRenderState: () => void;
  contentMeasurementLeaseRef: MutableRefObject<boolean>;
  morphProgress: SharedValue<number>;
  preparedSheetFrameRef: MutableRefObject<ActionTraySheetFrame | undefined>;
  resetMeasurements: () => void;
  returningToSheetRef: MutableRefObject<boolean>;
  shared: {
    active: SharedValue<boolean>;
    animationTravel: SharedValue<number>;
    closeGeneration: SharedValue<number>;
    originProgress: SharedValue<number>;
    surfaceOpacity: SharedValue<number>;
    translateY: SharedValue<number>;
  };
  transition: {
    completedGeneration: SharedValue<number>;
    layoutStartedGeneration: SharedValue<number>;
    startedAt: SharedValue<number>;
    startedGeneration: SharedValue<number>;
    lastHandledLayoutCompletionGenerationRef: MutableRefObject<number>;
  };
};

// assignment reset fences recycled native hosts from earlier transition callbacks
export const useActionTrayAssignmentReset = ({
  assignmentId,
  clearPreparedSheetFrame,
  clearRenderState,
  contentMeasurementLeaseRef,
  morphProgress,
  preparedSheetFrameRef,
  resetMeasurements,
  returningToSheetRef,
  shared,
  transition,
}: Params) => {
  const lastResetAssignmentIdRef = useRef(0);
  const {
    active,
    animationTravel,
    closeGeneration,
    originProgress,
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

  useLayoutEffect(() => {
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
    preparedSheetFrameRef.current = undefined;
    contentMeasurementLeaseRef.current = false;
    clearPreparedSheetFrame();
    returningToSheetRef.current = false;
  }, [
    assignmentId,
    clearPreparedSheetFrame,
    clearRenderState,
    contentMeasurementLeaseRef,
    morphProgress,
    preparedSheetFrameRef,
    resetMeasurements,
    returningToSheetRef,
    active,
    animationTravel,
    closeGeneration,
    completedGeneration,
    layoutStartedGeneration,
    lastHandledLayoutCompletionGenerationRef,
    originProgress,
    startedAt,
    startedGeneration,
    surfaceOpacity,
    translateY,
  ]);
};
