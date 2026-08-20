import { createContext, useContext } from "react";
import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { log } from "./logger";

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
};

export type TrayTransitionParticipant = "incoming" | "outgoing" | "layout";

const TrayTransitionStartContext =
  createContext<TrayTransitionStart | null>(null);

export const TrayTransitionStartProvider = TrayTransitionStartContext.Provider;

export const useTrayTransitionStart = () =>
  useContext(TrayTransitionStartContext);

export const resolveTrayTransitionGeneration = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  return (
    transitionStart?.generationValue.value ??
    transitionStart?.generation ??
    0
  );
};

export const resolveTrayTransitionFullScreenChanged = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  return (
    transitionStart?.fullScreenChangedValue.value ??
    (transitionStart?.fullScreenChanged ? 1 : 0)
  ) > 0;
};

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
  waitingForClock: boolean;
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
) => T;

// every participant joins one ui thread clock the first participant publishes the clock later participants backdate their inner animation to that start
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
        if (
          waitForClock &&
          !completed &&
          startedGeneration.value < generation
        ) {
          animation.waitingForClock = true;
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
        animation.waitingForClock = false;
        animation.started = true;

        if (!animation.diagnosticStarted) {
          animation.diagnosticStarted = true;
          scheduleOnRN(log, "TRANSITION PARTICIPANT START", {
            generation,
            participant,
            waitForClock,
            publishedClock,
            completed,
            clockStartedGeneration: startedGeneration.value,
            clockStartedAt: startedAt.value,
            innerStartedAt,
            now,
          });
        }

        if (onStartSignal) {
          scheduleOnRN(onStartSignal, innerStartedAt, generation);
        }
      };

      const onFrame = (
        animation: TransitionStartAnimation,
        now: number,
      ): boolean => {
        if (!animation.started) {
          if (
            animation.waitingForClock &&
            startedGeneration.value >= generation
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
            scheduleOnRN(log, "TRANSITION PARTICIPANT COMPLETE", {
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
        waitingForClock: false,
        started: false,
        diagnosticStarted: false,
        diagnosticCompleted: false,
      };
    },
  );
} as WithTrayTransitionStart;
