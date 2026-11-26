// geometry properties share one native layout start
import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimationObject,
  LayoutAnimationsValues,
  SharedValue,
} from "react-native-reanimated";
import * as Reanimated from "react-native-reanimated";
import * as TransitionStart from "../../transition-start";
import * as LayoutProgress from "../with-tray-layout-progress";
import {
  createTrayLayoutFollowerTransition,
  createTrayLayoutTransition,
} from "../tray-layout";

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
    __trayLayoutTest: { mockBuildTransition },
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
    __trayLayoutTest: { mockWithTrayTransitionStart },
  };
});

jest.mock("../with-tray-layout-progress", () => {
  const mockWithTrayLayoutProgress = jest.fn((animation: unknown) => ({
    kind: "progress",
    animation,
  }));

  return {
    withTrayLayoutProgress: mockWithTrayLayoutProgress,
    __trayLayoutTest: { mockWithTrayLayoutProgress },
  };
});

const reanimatedTestState = (
  Reanimated as typeof Reanimated & {
    __trayLayoutTest: {
      mockBuildTransition: jest.Mock;
    };
  }
).__trayLayoutTest;
const transitionStartTestState = (
  TransitionStart as typeof TransitionStart & {
    __trayLayoutTest: {
      mockWithTrayTransitionStart: jest.Mock;
    };
  }
).__trayLayoutTest;
const layoutProgressTestState = (
  LayoutProgress as typeof LayoutProgress & {
    __trayLayoutTest: {
      mockWithTrayLayoutProgress: jest.Mock;
    };
  }
).__trayLayoutTest;

// the shared value shape layout helpers expect
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
    const layoutStartSignal =
      transitionStartTestState.mockWithTrayTransitionStart.mock.calls[0]?.[7];
    expect(layoutStartSignal).toEqual(expect.any(Function));
    expect(layoutStartSignal).not.toBe(onStart);
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

describe("createTrayLayoutFollowerTransition", () => {
  const followerParams = (transitionGeneration: number) => ({
    transitionGeneration,
    transitionStartedAt: shared(0),
    transitionStartedGeneration: shared(0),
    transitionLayoutStartedGeneration: shared(0),
    transitionCompletedGeneration: shared(0),
  });

  it("joins the sheet's layout clock for each changing edge without owning the transition", () => {
    transitionStartTestState.mockWithTrayTransitionStart.mockClear();
    layoutProgressTestState.mockWithTrayLayoutProgress.mockClear();

    const animation = createTrayLayoutFollowerTransition(followerParams(7))(
      layoutValues,
    );
    const calls = transitionStartTestState.mockWithTrayTransitionStart.mock.calls;

    // originY and height change, width does not
    expect(calls).toHaveLength(2);

    for (const call of calls) {
      expect(call[5]).toBe(7);
      // never a layout participant, so it never publishes the layout start or completes the transition
      expect(call[6]).toBe("outgoing");
      expect(call[7]).toBeUndefined();
      // waits for the sheet's layout to start, then runs from the shared clock start
      expect(call[8]).toBe(false);
      expect(call[9]).toBe(true);
    }

    // the sheet alone drives the morph progress
    expect(
      layoutProgressTestState.mockWithTrayLayoutProgress,
    ).not.toHaveBeenCalled();
    expect(animation.animations.originY).toEqual({
      kind: "transition",
      animation: expect.anything(),
    });
    expect(animation.animations.width).toEqual({});
  });

  it("moves on its own curve when no transition owns the layout", () => {
    transitionStartTestState.mockWithTrayTransitionStart.mockClear();

    createTrayLayoutFollowerTransition(followerParams(0))(layoutValues);

    expect(
      transitionStartTestState.mockWithTrayTransitionStart,
    ).not.toHaveBeenCalled();
  });
});
