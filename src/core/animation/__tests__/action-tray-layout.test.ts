// verify geometry properties share one native layout start
import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimationObject,
  LayoutAnimationsValues,
  SharedValue,
} from "react-native-reanimated";
import * as Reanimated from "react-native-reanimated";
import * as TransitionStart from "../../transition-start";
import * as LayoutProgress from "../with-tray-layout-progress";
import { createTrayLayoutTransition } from "../action-tray-layout";

jest.mock("react-native-reanimated", () => {
  const mockBuildTransition = jest.fn(() => () => ({
    initialValues: {},
    animations: {
      originY: {} as AnimationObject,
      height: {} as AnimationObject,
      width: {} as AnimationObject,
    },
  }));
  const mockLinearTransition = {
    duration: jest.fn().mockReturnThis(),
    easing: jest.fn().mockReturnThis(),
    build: mockBuildTransition,
  };

  return {
    Easing: {
      bezier: jest.fn(() => ({ factory: jest.fn(() => "easing") })),
    },
    LinearTransition: mockLinearTransition,
    __actionTrayLayoutTest: { mockBuildTransition },
  };
});

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: jest.fn(),
}));

jest.mock("../../transition-start", () => {
  const mockWithTrayTransitionStart = jest.fn((animation: unknown) => ({
    kind: "transition",
    animation,
  }));

  return {
    withTrayTransitionStart: mockWithTrayTransitionStart,
    __actionTrayLayoutTest: { mockWithTrayTransitionStart },
  };
});

jest.mock("../with-tray-layout-progress", () => {
  const mockWithTrayLayoutProgress = jest.fn((animation: unknown) => ({
    kind: "progress",
    animation,
  }));

  return {
    withTrayLayoutProgress: mockWithTrayLayoutProgress,
    __actionTrayLayoutTest: { mockWithTrayLayoutProgress },
  };
});

const reanimatedTestState = (
  Reanimated as typeof Reanimated & {
    __actionTrayLayoutTest: {
      mockBuildTransition: jest.Mock;
    };
  }
).__actionTrayLayoutTest;
const transitionStartTestState = (
  TransitionStart as typeof TransitionStart & {
    __actionTrayLayoutTest: {
      mockWithTrayTransitionStart: jest.Mock;
    };
  }
).__actionTrayLayoutTest;
const layoutProgressTestState = (
  LayoutProgress as typeof LayoutProgress & {
    __actionTrayLayoutTest: {
      mockWithTrayLayoutProgress: jest.Mock;
    };
  }
).__actionTrayLayoutTest;

// create the shared value shape expected by layout helpers
const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

const layoutValues: LayoutAnimationsValues = {
  currentOriginX: 16,
  currentOriginY: 300,
  currentWidth: 358,
  currentHeight: 500,
  currentBorderRadius: 24,
  currentGlobalOriginX: 16,
  currentGlobalOriginY: 300,
  targetOriginX: 16,
  targetOriginY: 400,
  targetWidth: 358,
  targetHeight: 400,
  targetBorderRadius: 24,
  targetGlobalOriginX: 16,
  targetGlobalOriginY: 400,
  windowWidth: 390,
  windowHeight: 844,
};

describe("createTrayLayoutTransition", () => {
  it("joins changing shell geometry properties to the morph clock", () => {
    const onStart = jest.fn();
    const transition = createTrayLayoutTransition({
      transitionGeneration: 7,
      transitionStartedAt: shared(0),
      transitionStartedGeneration: shared(0),
      transitionLayoutStartedGeneration: shared(0),
      transitionCompletedGeneration: shared(0),
      morphProgress: shared(0),
      onStart,
    });

    const animation = transition(layoutValues);

    expect(reanimatedTestState.mockBuildTransition).toHaveBeenCalledTimes(1);
    expect(layoutProgressTestState.mockWithTrayLayoutProgress).toHaveBeenCalledTimes(
      1,
    );
    expect(
      transitionStartTestState.mockWithTrayTransitionStart,
    ).toHaveBeenCalledTimes(2);
    expect(
      transitionStartTestState.mockWithTrayTransitionStart.mock.calls[0]?.[6],
    ).toBe(
      "layout",
    );
    expect(
      transitionStartTestState.mockWithTrayTransitionStart.mock.calls[0]?.[7],
    ).toBe(
      onStart,
    );
    expect(
      transitionStartTestState.mockWithTrayTransitionStart.mock.calls[1]?.[6],
    ).toBe(
      "layout",
    );
    expect(
      transitionStartTestState.mockWithTrayTransitionStart.mock.calls[1]?.[7],
    ).toBeUndefined();
    expect(animation.animations.originY).toEqual({
      kind: "transition",
      animation: {
        kind: "progress",
        animation: expect.anything(),
      },
    });
    expect(animation.animations.height).toEqual({
      kind: "transition",
      animation: expect.anything(),
    });
    expect(animation.animations.width).toEqual({});
  });
});
