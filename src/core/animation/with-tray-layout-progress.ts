import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";

interface TrayLayoutProgressAnimation
  extends Animation<TrayLayoutProgressAnimation> {
  current: AnimatableValue;
  previousAnimation: AnimationObject | null;
}

type WithTrayLayoutProgress = <T extends AnimatableValue>(
  nextAnimation: T,
  progress: SharedValue<number>,
  source: number,
  target: number,
) => T;

const resolveProgress = (current: number, source: number, target: number) => {
  "worklet";

  const distance = target - source;

  if (Math.abs(distance) < 0.001) {
    return 1;
  }

  return Math.min(1, Math.max(0, (current - source) / distance));
};

// follow the value reanimated actually rendered instead of starting a parallel timing animation that could drift from native layout scheduling
export const withTrayLayoutProgress = function <T extends AnimationObject>(
  nextAnimationInput: T | (() => T),
  progress: SharedValue<number>,
  source: number,
  target: number,
): Animation<TrayLayoutProgressAnimation> {
  "worklet";

  return defineAnimation<TrayLayoutProgressAnimation, T>(
    nextAnimationInput,
    () => {
      "worklet";

      const nextAnimation =
        typeof nextAnimationInput === "function"
          ? nextAnimationInput()
          : nextAnimationInput;

      const onFrame = (
        animation: TrayLayoutProgressAnimation,
        now: number,
      ) => {
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;
        const current =
          typeof animation.current === "number"
            ? animation.current
            : target;

        progress.value = finished
          ? 1
          : resolveProgress(current, source, target);

        return finished;
      };

      const onStart = (
        animation: TrayLayoutProgressAnimation,
        value: AnimatableValue,
        now: number,
        previousAnimation: AnimationObject | null,
      ) => {
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }

        progress.value = 0;
        nextAnimation.onStart(nextAnimation, value, now, previousAnimation);
        animation.current = nextAnimation.current ?? value;
        animation.previousAnimation = previousAnimation;
      };

      const callback = (finished?: boolean) => {
        if (finished) {
          progress.value = 1;
        }

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
} as WithTrayLayoutProgress;
