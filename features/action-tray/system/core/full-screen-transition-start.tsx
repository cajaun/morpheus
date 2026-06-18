import React, { createContext, useContext } from "react";
import {
  defineAnimation,
  runOnJS,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";

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

// This is an event latch, not a timed delay. The existing animation remains at
// its entering initial value until the parent layout worklet publishes the
// matching fullscreen transition generation.
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
            return false;
          }

          nextAnimation.onStart(
            nextAnimation,
            animation.current,
            layoutStartedAt.value,
            animation.previousAnimation,
          );
          animation.previousAnimation = null;
          animation.started = true;

          if (onRelease && releaseStepKey) {
            runOnJS(onRelease)(releaseStepKey, performance.now());
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
    // Publish the timestamp first; the generation is the release flag read by
    // entering animations and must only become visible once the clock exists.
    layoutStartedAt.value = startedAt;
    startedGeneration.value = generation;
  }
};

interface LayoutStartSignalAnimation
  extends Animation<LayoutStartSignalAnimation> {
  current: AnimatableValue;
  previousAnimation: AnimationObject | null;
}

type WithFullScreenLayoutStartSignal = <T extends AnimatableValue>(
  nextAnimation: T,
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  generation: number,
  onStartSignal?: (startedAt: number) => void,
) => T;

// The signal comes from a real geometry animation's onStart, not from layout
// configuration. Content can therefore inherit the exact same UI-frame clock.
export const withFullScreenLayoutStartSignal = function <
  T extends AnimationObject,
>(
  nextAnimationInput: T | (() => T),
  startedGeneration: SharedValue<number>,
  layoutStartedAt: SharedValue<number>,
  generation: number,
  onStartSignal?: (startedAt: number) => void,
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

      const onFrame = (
        animation: LayoutStartSignalAnimation,
        now: number,
      ) => {
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;
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
        animation.previousAnimation = previousAnimation;

        publishFullScreenLayoutStart(
          startedGeneration,
          layoutStartedAt,
          generation,
          now,
        );

        if (onStartSignal) {
          runOnJS(onStartSignal)(performance.now());
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
      };
    },
  );
} as WithFullScreenLayoutStartSignal;
