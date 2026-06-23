import { createContext, useContext } from "react";
import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export type FullScreenTransitionStart = {
  enabled: boolean;
  generation: number;
  startedAt: SharedValue<number>;
  startedGeneration: SharedValue<number>;
};

const FullScreenTransitionStartContext =
  createContext<FullScreenTransitionStart | null>(null);

export const FullScreenTransitionStartProvider =
  FullScreenTransitionStartContext.Provider;

export const useFullScreenTransitionStart = () =>
  useContext(FullScreenTransitionStartContext);

export const shouldAwaitFullScreenLayoutStart = (
  transition: FullScreenTransitionStart | null,
) => {
  "worklet";

  return (
    transition !== null &&
    transition.enabled &&
    transition.startedGeneration.value < transition.generation
  );
};

interface LayoutStartGateAnimation
  extends Animation<LayoutStartGateAnimation> {
  current: AnimatableValue;
  started: boolean;
  previousAnimation: AnimationObject | null;
}

type WithFullScreenLayoutStart = <T extends AnimatableValue>(
  nextAnimation: T,
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  requiredGeneration: number,
  onRelease?: (stepKey: string, startedAt: number) => void,
  releaseStepKey?: string,
) => T;

// this event latch holds enter animation values until layout publishes a matching generation
export const withFullScreenLayoutStart = function <T extends AnimationObject>(
  nextAnimationInput: T | (() => T),
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  requiredGeneration: number,
  onRelease?: (stepKey: string, startedAt: number) => void,
  releaseStepKey?: string,
): Animation<LayoutStartGateAnimation> {
  "worklet";

  return defineAnimation<LayoutStartGateAnimation, T>(
    nextAnimationInput,
    () => {
      "worklet";

      const nextAnimation =
        typeof nextAnimationInput === "function"
          ? nextAnimationInput()
          : nextAnimationInput;

      const onFrame = (
        animation: LayoutStartGateAnimation,
        now: number,
      ): boolean => {
        if (!animation.started) {
          if (startedGeneration.value < requiredGeneration) {
            // keep the entering animation frozen until shell geometry starts
            return false;
          }

          // start the held animation at the layout start timestamp for clock alignment
          nextAnimation.onStart(
            nextAnimation,
            animation.current,
            layoutStartedAt.value,
            animation.previousAnimation,
          );
          animation.previousAnimation = null;
          animation.started = true;

          if (onRelease && releaseStepKey) {
            scheduleOnRN(onRelease, releaseStepKey, performance.now());
          }
        }

        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;
        return finished;
      };

      const onStart = (
        animation: LayoutStartGateAnimation,
        value: AnimatableValue,
        _now: number,
        previousAnimation: AnimationObject | null,
      ) => {
        animation.current = value;
        animation.started = false;
        animation.previousAnimation = previousAnimation;

        if (nextAnimation.reduceMotion === undefined) {
          // preserve reduced motion settings through the higher order animation
          nextAnimation.reduceMotion = animation.reduceMotion;
        }
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
        started: false,
      };
    },
  );
} as WithFullScreenLayoutStart;

export const publishFullScreenLayoutStart = (
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  generation: number,
  startedAt: number,
) => {
  "worklet";

  if (generation > startedGeneration.value) {
    // publish the timestamp before the generation release flag
    layoutStartedAt.value = startedAt;
    startedGeneration.value = generation;
  }
};

interface LayoutStartSignalAnimation
  extends Animation<LayoutStartSignalAnimation> {
  current: AnimatableValue;
  layoutStart: number;
  linkedStarts: number[];
  previousAnimation: AnimationObject | null;
}

type LinkedLayoutValue = {
  value: SharedValue<number>;
  target: number;
  layoutTarget: number;
};

type WithFullScreenLayoutStartSignal = <T extends AnimatableValue>(
  nextAnimation: T,
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  generation: number,
  onStartSignal?: (startedAt: number) => void,
  linkedLayoutValue?: LinkedLayoutValue | LinkedLayoutValue[],
) => T;

// content inherits the ui frame clock from geometry animation start
export const withFullScreenLayoutStartSignal = function <
  T extends AnimationObject,
>(
  nextAnimationInput: T | (() => T),
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  generation: number,
  onStartSignal?: (startedAt: number) => void,
  linkedLayoutValue?: LinkedLayoutValue,
): Animation<LayoutStartSignalAnimation> {
  "worklet";

  return defineAnimation<LayoutStartSignalAnimation, T>(
    nextAnimationInput,
    () => {
      "worklet";

      const nextAnimation =
        typeof nextAnimationInput === "function"
          ? nextAnimationInput()
          : nextAnimationInput;
      const linkedLayoutValues = linkedLayoutValue
        ? Array.isArray(linkedLayoutValue)
          ? linkedLayoutValue
          : [linkedLayoutValue]
        : [];

      const onFrame = (
        animation: LayoutStartSignalAnimation,
        now: number,
      ) => {
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;

        linkedLayoutValues.forEach((linkedValue, index) => {
          // linked values follow layout progress instead of their own duration
          const layoutCurrent =
            typeof animation.current === "number"
              ? animation.current
              : linkedValue.layoutTarget;
          const layoutDistance =
            linkedValue.layoutTarget - animation.layoutStart;
          const progress =
            Math.abs(layoutDistance) < 0.001
              ? 1
              : Math.min(
                  1,
                  Math.max(
                    0,
                    (layoutCurrent - animation.layoutStart) /
                      layoutDistance,
                  ),
                );

          linkedValue.value.value = finished
            ? linkedValue.target
            : animation.linkedStarts[index] +
              (linkedValue.target - animation.linkedStarts[index]) *
                progress;
        });

        return finished;
      };

      const onStart = (
        animation: LayoutStartSignalAnimation,
        value: AnimatableValue,
        now: number,
        previousAnimation: AnimationObject | null,
      ) => {
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }

        nextAnimation.onStart(nextAnimation, value, now, previousAnimation);
        animation.current = nextAnimation.current ?? value;
        // layout start becomes the origin for progress used by linked values
        animation.layoutStart =
          typeof value === "number"
            ? value
            : linkedLayoutValues[0]?.layoutTarget ?? 0;
        animation.linkedStarts = linkedLayoutValues.map(
          (linkedValue) => linkedValue.value.value,
        );
        animation.previousAnimation = previousAnimation;

        publishFullScreenLayoutStart(
          startedGeneration,
          layoutStartedAt,
          generation,
          now,
        );

        if (onStartSignal) {
          scheduleOnRN(onStartSignal, performance.now());
        }
      };

      const callback = (finished?: boolean) => {
        nextAnimation.callback?.(finished);
      };

      return {
        isHigherOrder: true,
        onFrame,
        onStart,
        current: nextAnimation.current!,
        layoutStart: 0,
        linkedStarts: [],
        callback,
        previousAnimation: null,
      };
    },
  );
} as WithFullScreenLayoutStartSignal;
