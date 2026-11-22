import {
  Easing,
  useAnimatedReaction,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  FULL_SCREEN_ENTER_HOLD_FRAMES,
  FULL_SCREEN_LAYOUT_DURATION,
  FULL_SCREEN_SHELL_EASING_POINTS,
} from "../constants";
import { logWorklet } from "../logger";
import { withTrayTransitionStart } from "../transition-start";

// the shell starts the boundary clock so frame, footer and content share one timestamp
export const useBoundaryClockStart = ({
  boundaryActive,
  morphStartedGeneration,
  morphProgress,
  transitionStartedGeneration,
  transitionStartedAt,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  contentCommittedGeneration,
  waitForContentCommit,
  transitionGeneration,
  entersFullScreen,
  onTransitionStart,
  onTransitionComplete,
}: {
  boundaryActive: SharedValue<boolean>;
  morphStartedGeneration: SharedValue<number>;
  morphProgress: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionStartedAt: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  contentCommittedGeneration: SharedValue<number> | undefined;
  waitForContentCommit: boolean;
  transitionGeneration: number;
  entersFullScreen: boolean;
  onTransitionStart?: (startedAt: number, generation: number) => void;
  onTransitionComplete?: (finishedAt: number, generation: number) => void;
}) => {
  useAnimatedReaction(
    () => ({
      active: boundaryActive.value,
      startedGeneration: transitionStartedGeneration.value,
      completedGeneration: transitionCompletedGeneration.value,
      contentCommitted:
        !waitForContentCommit ||
        (contentCommittedGeneration?.value ?? 0) >= transitionGeneration,
    }),
    (state) => {
      if (
        !state.active ||
        !state.contentCommitted ||
        transitionGeneration <= 0 ||
        state.completedGeneration >= transitionGeneration ||
        morphStartedGeneration.value === transitionGeneration
      ) {
        return;
      }

      morphStartedGeneration.value = transitionGeneration;
      logWorklet("BOUNDARY CLOCK START", {
        generation: transitionGeneration,
        startedAt: transitionStartedAt.value,
        startedGeneration: state.startedGeneration,
        layoutStartedGeneration: transitionLayoutStartedGeneration.value,
        completedGeneration: state.completedGeneration,
        morphProgress: morphProgress.value,
      });
      const onTransitionStartSignal = onTransitionStart
        ? (startedAt: number, generation: number) => {
            "worklet";
            scheduleOnRN(onTransitionStart, startedAt, generation);
          }
        : undefined;
      morphProgress.value = withTrayTransitionStart(
        withTiming(
          1,
          {
            duration: FULL_SCREEN_LAYOUT_DURATION,
            easing: Easing.bezier(...FULL_SCREEN_SHELL_EASING_POINTS),
          },
          (finished) => {
            "worklet";

            if (finished && onTransitionComplete) {
              scheduleOnRN(
                onTransitionComplete,
                performance.now(),
                transitionGeneration,
              );
            }
          },
        ),
        transitionStartedGeneration,
        transitionStartedAt,
        transitionLayoutStartedGeneration,
        transitionCompletedGeneration,
        transitionGeneration,
        "layout",
        onTransitionStartSignal,
        false,
        false,
        undefined,
        entersFullScreen ? FULL_SCREEN_ENTER_HOLD_FRAMES : 0,
      );
    },
    [
      boundaryActive,
      contentCommittedGeneration,
      entersFullScreen,
      morphProgress,
      morphStartedGeneration,
      onTransitionComplete,
      onTransitionStart,
      transitionCompletedGeneration,
      transitionGeneration,
      transitionLayoutStartedGeneration,
      transitionStartedAt,
      transitionStartedGeneration,
      waitForContentCommit,
    ],
  );
};
