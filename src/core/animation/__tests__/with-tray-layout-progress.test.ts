import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimatableValue,
  AnimationObject,
  SharedValue,
} from "react-native-reanimated";
import { withTrayLayoutProgress } from "../with-tray-layout-progress";

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual(
    "react-native-reanimated/mock",
  ) as Record<string, unknown>;

  return {
    ...Reanimated,
    defineAnimation: (_starting: unknown, factory: () => unknown) => factory(),
  };
});

const shared = (value: number) => ({ value }) as SharedValue<number>;

const createGeometryAnimation = () => {
  let target = 70;
  let finished = false;
  const animation: AnimationObject<number> = {
    current: 40,
    onStart: (
      currentAnimation: AnimationObject<number>,
      value: AnimatableValue,
    ) => {
      currentAnimation.current = value as number;
    },
    onFrame: (currentAnimation: AnimationObject<number>) => {
      currentAnimation.current = target;
      return finished;
    },
  };

  return {
    animation,
    finishAt(value: number) {
      target = value;
      finished = true;
    },
  };
};

describe("tray layout morph progress", () => {
  it("follows forward geometry from zero to one", () => {
    const progress = shared(1);
    const geometry = createGeometryAnimation();
    const tracked = withTrayLayoutProgress(
      geometry.animation as unknown as number,
      progress,
      40,
      100,
    ) as unknown as AnimationObject<number>;

    tracked.onStart(tracked, 40, 100, null);
    expect(progress.value).toBe(0);

    tracked.onFrame(tracked, 110);
    expect(progress.value).toBe(0.5);

    geometry.finishAt(100);
    expect(tracked.onFrame(tracked, 120)).toBe(true);
    expect(progress.value).toBe(1);
  });

  it("normalizes reverse geometry in the same zero-to-one direction", () => {
    const progress = shared(1);
    const geometry = createGeometryAnimation();
    const tracked = withTrayLayoutProgress(
      geometry.animation as unknown as number,
      progress,
      100,
      40,
    ) as unknown as AnimationObject<number>;

    tracked.onStart(tracked, 100, 100, null);
    tracked.onFrame(tracked, 110);

    expect(progress.value).toBe(0.5);
  });
});
