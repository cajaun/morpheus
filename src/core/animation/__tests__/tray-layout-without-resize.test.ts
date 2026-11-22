// a sheet step change at an unchanged height still starts, syncs and completes
import { describe, expect, it, jest } from "@jest/globals";
import type { AnimationObject, SharedValue } from "react-native-reanimated";
import { startTrayLayoutWithoutResize } from "../tray-layout";

jest.mock("react-native-reanimated", () => ({
  Easing: { bezier: jest.fn(() => () => 0) },
  LinearTransition: {},
  defineAnimation: (_starting: unknown, factory: () => unknown) => factory(),
  // a timing animation that finishes 300 ms after it starts
  withTiming: jest.fn(
    (
      toValue: number,
      _config: unknown,
      callback?: (finished?: boolean) => void,
    ) => {
      let startedAt = 0;

      return {
        current: 0,
        callback,
        onStart: (animation: { current: number }, value: number, now: number) => {
          startedAt = now;
          animation.current = value;
        },
        onFrame: (animation: { current: number }, now: number) => {
          const finished = now - startedAt >= 300;
          animation.current = finished ? toValue : 0.5;
          return finished;
        },
      };
    },
  ),
}));

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (
    callback: (...args: never[]) => unknown,
    ...args: never[]
  ) => callback(...args),
}));

const shared = (value: number) => ({ value }) as SharedValue<number>;

const setup = (generation = 6) => {
  const values = {
    transitionStartedAt: shared(0),
    transitionStartedGeneration: shared(5),
    transitionLayoutStartedGeneration: shared(5),
    transitionCompletedGeneration: shared(5),
    morphProgress: shared(0),
  };
  const onComplete = jest.fn();

  return { values, onComplete, generation };
};

describe("startTrayLayoutWithoutResize", () => {
  it("opens the content barrier, starts the clock and completes the step", () => {
    const { values, onComplete, generation } = setup();

    expect(
      startTrayLayoutWithoutResize({
        transitionGeneration: generation,
        ...values,
        onComplete,
      }),
    ).toBe(true);

    const animation = values.morphProgress.value as unknown as AnimationObject<number> & {
      callback?: (finished?: boolean) => void;
    };

    animation.onStart(animation, 0, 100, null);

    // content waiting on the layout start joins the shared clock
    expect(values.transitionLayoutStartedGeneration.value).toBe(generation);
    expect(values.transitionStartedGeneration.value).toBe(generation);
    expect(values.transitionStartedAt.value).toBe(100);

    expect(animation.onFrame(animation, 250)).toBe(false);
    expect(values.transitionCompletedGeneration.value).toBe(5);

    expect(animation.onFrame(animation, 400)).toBe(true);
    expect(values.transitionCompletedGeneration.value).toBe(generation);

    animation.callback?.(true);
    expect(onComplete).toHaveBeenCalledWith(expect.any(Number), generation);
  });

  it("does nothing when the layout transition already started", () => {
    const { values, onComplete, generation } = setup();
    values.transitionLayoutStartedGeneration.value = generation;

    expect(
      startTrayLayoutWithoutResize({
        transitionGeneration: generation,
        ...values,
        onComplete,
      }),
    ).toBe(false);
    expect(values.morphProgress.value).toBe(0);
  });
});
