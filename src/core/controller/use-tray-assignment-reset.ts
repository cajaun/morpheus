import { useLayoutEffect, useRef, type RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import { SCREEN_HEIGHT } from "../constants";
import { log } from "../logger";
import type { TraySheetFrame } from "../types/tray";

type Params = {
  assignmentId: number;
  clearPreparedSheetFrame: () => void;
  clearRenderState: () => void;
  contentMeasurementLeaseRef: RefObject<boolean>;
  originGeometryLeaseRef: RefObject<boolean>;
  morphProgress: SharedValue<number>;
  preparedSheetFrameRef: RefObject<TraySheetFrame | undefined>;
  committedSheetFrameRef: RefObject<TraySheetFrame | undefined>;
  resetMeasurements: () => void;
  returningToSheetRef: RefObject<boolean>;
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
  clearPreparedSheetFrame,
  clearRenderState,
  contentMeasurementLeaseRef,
  originGeometryLeaseRef,
  morphProgress,
  preparedSheetFrameRef,
  committedSheetFrameRef,
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
    preparedSheetFrameRef.current = undefined;
    committedSheetFrameRef.current = undefined;
    contentMeasurementLeaseRef.current = false;
    originGeometryLeaseRef.current = false;
    clearPreparedSheetFrame();
    returningToSheetRef.current = false;
  }, [
    assignmentId,
    clearPreparedSheetFrame,
    clearRenderState,
    contentMeasurementLeaseRef,
    originGeometryLeaseRef,
    morphProgress,
    preparedSheetFrameRef,
    committedSheetFrameRef,
    resetMeasurements,
    returningToSheetRef,
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
