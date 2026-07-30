import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimatableValue,
  AnimationObject,
  SharedValue,
} from "react-native-reanimated";
import {
  publishFullScreenLayoutStart,
  shouldAwaitFullScreenLayoutStart,
  withFullScreenLayoutStart,
  withFullScreenLayoutStartSignal,
} from "../full-screen-transition-start";

// probe fullscreen layout latches without waiting for a native layout animation
jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual(
    "react-native-reanimated/mock",
  ) as Record<string, unknown>;

  return {
    ...Reanimated,
    defineAnimation: (_starting: unknown, factory: () => unknown) => factory(),
  };
});

jest.mock("react-native-worklets", () => {
  const Worklets = jest.requireActual(
    "react-native-worklets",
  ) as Record<string, unknown>;

  return {
    ...Worklets,
    scheduleOnRN: (
      callback: (...args: never[]) => unknown,
      ...args: never[]
    ) => callback(...args),
  };
});

const shared = (value: number) => ({ value }) as SharedValue<number>;

describe("fullscreen transition start synchronization", () => {
  it("keeps generations monotonic and only waits for a pending generation", () => {
    const startedGeneration = shared(2);
    const layoutStartedAt = shared(50);

    expect(
      shouldAwaitFullScreenLayoutStart({
        enabled: true,
        generation: 3,
        startedAt: layoutStartedAt,
        startedGeneration,
      }),
    ).toBe(true);

    publishFullScreenLayoutStart(
      startedGeneration,
      layoutStartedAt,
      3,
      100,
    );

    expect(startedGeneration.value).toBe(3);
    expect(layoutStartedAt.value).toBe(100);
    expect(
      shouldAwaitFullScreenLayoutStart({
        enabled: true,
        generation: 3,
        startedAt: layoutStartedAt,
        startedGeneration,
      }),
    ).toBe(false);

    publishFullScreenLayoutStart(
      startedGeneration,
      layoutStartedAt,
      2,
      200,
    );
    expect(startedGeneration.value).toBe(3);
    expect(layoutStartedAt.value).toBe(100);
  });

  it("holds an entering animation until the layout generation starts", () => {
    const startedGeneration = shared(0);
    const layoutStartedAt = shared(0);
    const release = jest.fn<(stepKey: string, startedAt: number) => void>();
    const inner: AnimationObject<number> = {
      current: 0,
      onStart: jest.fn(
        (
          animation: AnimationObject<number>,
          current: AnimatableValue,
        ) => {
          animation.current = current as number;
        },
      ),
      onFrame: jest.fn((animation: AnimationObject<number>) => {
        animation.current = 1;
        return true;
      }),
    };

    const gated = withFullScreenLayoutStart(
      inner as unknown as number,
      startedGeneration,
      layoutStartedAt,
      1,
      release,
      "fullscreen-step",
    ) as unknown as AnimationObject<number>;

    gated.onStart(gated, 0, 100, null);

    expect(gated.onFrame(gated, 101)).toBe(false);
    expect(inner.onStart).not.toHaveBeenCalled();
    expect(gated.current).toBe(0);

    publishFullScreenLayoutStart(
      startedGeneration,
      layoutStartedAt,
      1,
      105,
    );

    expect(gated.onFrame(gated, 110)).toBe(true);
    expect(inner.onStart).toHaveBeenCalledWith(inner, 0, 105, null);
    expect(release).toHaveBeenCalledWith(
      "fullscreen-step",
      expect.any(Number),
    );
    expect(gated.current).toBe(1);
  });

  it("publishes the real geometry onStart timestamp", () => {
    const startedGeneration = shared(0);
    const layoutStartedAt = shared(0);
    const geometry: AnimationObject<number> = {
      current: 40,
      onStart: jest.fn(),
      onFrame: jest.fn((animation: AnimationObject<number>) => {
        animation.current = 70;
        return false;
      }),
    };
    const linkedValue = shared(0);
    const secondLinkedValue = shared(1);

    const signaledGeometry = withFullScreenLayoutStartSignal(
      geometry as unknown as number,
      startedGeneration,
      layoutStartedAt,
      1,
      undefined,
      [
        {
          value: linkedValue,
          target: 50,
          layoutTarget: 100,
        },
        {
          value: secondLinkedValue,
          target: 0.9,
          layoutTarget: 100,
        },
      ],
    ) as unknown as AnimationObject<number>;

    signaledGeometry.onStart(signaledGeometry, 40, 125, null);

    expect(geometry.onStart).toHaveBeenCalledWith(
      geometry,
      40,
      125,
      null,
    );
    expect(layoutStartedAt.value).toBe(125);
    expect(startedGeneration.value).toBe(1);

    signaledGeometry.onFrame(signaledGeometry, 130);
    expect(linkedValue.value).toBe(25);
    expect(secondLinkedValue.value).toBeCloseTo(0.95);
  });
});
