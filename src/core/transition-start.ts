import { createContext, useContext } from "react";
import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";
import { logWorklet } from "./logger";

export type TrayTransitionStart = {
  generation: number;
  fullScreenChanged: boolean;
  generationValue: SharedValue<number>;
  fullScreenChangedValue: SharedValue<number>;
  morphProgress?: SharedValue<number>;
  startedAt: SharedValue<number>;
  startedGeneration: SharedValue<number>;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  // Immutable policy captured with the transition so sheet keyboard handoffs
  // cannot race a late shared-value update on the UI thread.
  keyboardStepTransition?: boolean;
};

export type TrayTransitionParticipant = "incoming" | "outgoing" | "layout";

const TrayTransitionStartContext =
  createContext<TrayTransitionStart | null>(null);

export const TrayTransitionStartProvider = TrayTransitionStartContext.Provider;

// read the transition clock shared by shell and content participants
export const useTrayTransitionStart = () =>
  useContext(TrayTransitionStartContext);

// resolve the newest generation across render and ui thread state
export const resolveTrayTransitionGeneration = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  // let the descriptor lead until the shared generation catches up
  if (descriptorGeneration <= 0) {
    return 0;
  }

  return Math.max(
    descriptorGeneration,
    transitionStart?.generationValue.value ?? 0,
  );
};

// resolve fullscreen change from the descriptor until shared state catches up
export const resolveTrayTransitionFullScreenChanged = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  if (descriptorGeneration <= 0) {
    return false;
  }

  const sharedGeneration = transitionStart?.generationValue.value ?? 0;
  const sharedFullScreenChanged =
    transitionStart?.fullScreenChangedValue.value ?? 0;

  // use descriptor fullscreen state until the shared generation advances
  return (
    (sharedGeneration > descriptorGeneration
      ? sharedFullScreenChanged
      : transitionStart?.fullScreenChanged
        ? 1
        : 0) > 0
  );
};

// Every rendered participant waits for the shell layout participant. Publishing
// a keyboard snapshot early is only a mount/measurement optimization; it must
// not create a second animation clock for the incoming or outgoing content.
export const shouldWaitForTrayLayoutStart = (
  transitionStart: TrayTransitionStart | null,
  generation: number,
) => {
  "worklet";

  return transitionStart !== null && generation > 0;
};

// publish the timestamp before the generation for joining participants
export const publishTrayTransitionStart = (
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  generation: number,
  at: number,
) => {
  "worklet";

  if (generation > startedGeneration.value) {
    // publish the timestamp before the generation so joining participants see a complete clock record when they observe the generation
    startedAt.value = at;
    startedGeneration.value = generation;
  }
};

// record completion once so late callbacks cannot move the clock backwards
export const completeTrayTransition = (
  completedGeneration: SharedValue<number>,
  generation: number,
) => {
  "worklet";

  if (generation > completedGeneration.value) {
    completedGeneration.value = generation;
  }
};

interface TransitionStartAnimation
  extends Animation<TransitionStartAnimation> {
  current: AnimatableValue;
  previousAnimation: AnimationObject | null;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  waitingForStart: boolean;
  started: boolean;
  diagnosticStarted: boolean;
  diagnosticCompleted: boolean;
}

type WithTrayTransitionStart = <T extends AnimatableValue>(
  nextAnimation: T,
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  layoutStartedGeneration: SharedValue<number>,
  completedGeneration: SharedValue<number>,
  generation: number,
  participant: TrayTransitionParticipant,
  onStartSignal?: (startedAt: number, generation: number) => void,
  waitForClock?: boolean,
  waitForLayoutStart?: boolean,
) => T;

// join every participant to one ui thread clock
export const withTrayTransitionStart = function <T extends AnimationObject>(
  nextAnimationInput: T | (() => T),
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  layoutStartedGeneration: SharedValue<number>,
  completedGeneration: SharedValue<number>,
  generation: number,
  participant: TrayTransitionParticipant,
  onStartSignal?: (startedAt: number, generation: number) => void,
  waitForClock = false,
  waitForLayoutStart = false,
): Animation<TransitionStartAnimation> {
  "worklet";

  return defineAnimation<TransitionStartAnimation, T>(
    nextAnimationInput,
    () => {
      "worklet";

      const nextAnimation =
        typeof nextAnimationInput === "function"
          ? nextAnimationInput()
          : nextAnimationInput;

      const startInnerAnimation = (
        animation: TransitionStartAnimation,
        value: AnimatableValue,
        now: number,
      ) => {
        const completed = completedGeneration.value >= generation;
        const clockNotStarted = startedGeneration.value < generation;
        const layoutNotStarted =
          layoutStartedGeneration.value < generation;
        if (
          !completed &&
          ((waitForClock && clockNotStarted) ||
            (waitForLayoutStart && layoutNotStarted))
        ) {
          animation.waitingForStart = true;
          return;
        }

        const hasSameGeneration =
          !completed && startedGeneration.value === generation;
        const innerStartedAt = hasSameGeneration
          ? startedAt.value
          : now;

        const publishedClock = !completed && startedGeneration.value < generation;

        if (publishedClock) {
          publishTrayTransitionStart(
            startedGeneration,
            startedAt,
            generation,
            now,
          );
        }

        nextAnimation.onStart(
          nextAnimation,
          value,
          innerStartedAt,
          animation.previousAnimation,
        );
        animation.current = nextAnimation.current ?? value;
        animation.waitingForStart = false;
        animation.started = true;

        if (!animation.diagnosticStarted) {
          animation.diagnosticStarted = true;
          logWorklet("TRANSITION PARTICIPANT START", {
            generation,
            participant,
            waitForClock,
            waitForLayoutStart,
            publishedClock,
            completed,
            clockStartedGeneration: startedGeneration.value,
            clockStartedAt: startedAt.value,
            innerStartedAt,
            now,
          });
        }

        if (onStartSignal) {
          // Start signals are worklet callbacks. Each caller is responsible
          // for scheduling its JS-side work, if needed; sending the callback
          // itself through scheduleOnRN makes Worklets look up a stale hash.
          onStartSignal(innerStartedAt, generation);
        }
      };

      const onFrame = (
        animation: TransitionStartAnimation,
        now: number,
      ): boolean => {
        if (!animation.started) {
          if (
            animation.waitingForStart &&
            (!waitForClock || startedGeneration.value >= generation) &&
            (!waitForLayoutStart ||
              layoutStartedGeneration.value >= generation)
          ) {
            startInnerAnimation(animation, animation.current, now);
          }

          if (!animation.started) {
            return false;
          }
        }

        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;

        if (
          finished &&
          (participant === "layout" ||
            (participant === "incoming" &&
              animation.layoutStartedGeneration.value < generation))
        ) {
          if (!animation.diagnosticCompleted) {
            animation.diagnosticCompleted = true;
            logWorklet("TRANSITION PARTICIPANT COMPLETE", {
              generation,
              participant,
              clockStartedGeneration: startedGeneration.value,
              clockStartedAt: startedAt.value,
              layoutStartedGeneration:
                animation.layoutStartedGeneration.value,
              completedGeneration: animation.completedGeneration.value,
              now,
            });
          }
          completeTrayTransition(animation.completedGeneration, generation);
        }

        return finished;
      };

      const onStart = (
        animation: TransitionStartAnimation,
        value: AnimatableValue,
        now: number,
        previousAnimation: AnimationObject | null,
      ) => {
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }

        animation.current = value;
        animation.previousAnimation = previousAnimation;

        if (
          participant === "layout" &&
          animation.completedGeneration.value < generation
        ) {
          animation.layoutStartedGeneration.value = generation;
        }

        startInnerAnimation(animation, value, now);
      };

      const callback = (finished?: boolean) => {
        nextAnimation.callback?.(finished);
      };

      return {
        isHigherOrder: true,
        onFrame,
        onStart,
        current: nextAnimation.current!,
        callback,
        previousAnimation: null,
        layoutStartedGeneration,
        completedGeneration,
        waitingForStart: false,
        started: false,
        diagnosticStarted: false,
        diagnosticCompleted: false,
      };
    },
  );
} as WithTrayTransitionStart;
