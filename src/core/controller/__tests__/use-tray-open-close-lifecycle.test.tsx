import React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import { useTrayOpenCloseLifecycle } from "../use-tray-open-close-lifecycle";

// worklets run at once so lifecycle ownership is inspectable without native timing
// timing configs are recorded so the trigger morph curve is observable
const mockTimingConfigs: { target: number; config: any }[] = [];

jest.mock("react-native-reanimated", () => ({
  Easing: {
    bezier: (x1: number, y1: number, x2: number, y2: number) => ({
      bezier: [x1, y1, x2, y2],
    }),
  },
  runOnUI: (worklet: (...args: any[]) => void) =>
    (...args: any[]) => worklet(...args),
  withSpring: (target: number, _config: object, callback?: (finished: boolean) => void) => {
    callback?.(true);
    return target;
  },
  withTiming: (target: number, config: object, callback?: (finished: boolean) => void) => {
    mockTimingConfigs.push({ target, config });
    callback?.(true);
    return target;
  },
}));

// lifecycle callbacks run synchronously so the completion handoff is observable
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (callback: (...args: any[]) => void, ...args: any[]) =>
    callback(...args),
}));

jest.mock("../../logger", () => ({
  isTrayDebugLoggingEnabled: jest.fn(() => false),
  log: jest.fn(),
  logWorklet: jest.fn(),
}));

// a mutable shared value for the lifecycle harness
const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

// one opening mode with controlled lifecycle callbacks
const renderOpeningLifecycle = (open?: "slide" | "expandFromTrigger") => {
  const enableLayout = jest.fn();
  const onTransitionCompleted = jest.fn();
  const originGeometryLeaseRef = { current: false };
  const originTargetContentHeight = shared(0);
  const params = {
    visible: true,
    rootTrayId: "root",
    trayId: "tray",
    footer: "footer",
    renderState: {
      state: {
        renderedTrayId: "tray",
        renderedFooter: "footer",
      },
      actions: {
        showLatestSnapshot: jest.fn(),
        clear: jest.fn(),
      },
    },
    measurements: {
      shared: {
        resolvedContentHeight: shared(311),
        measuredFooterHeight: shared(90),
      },
      refs: {
        latestResolvedContentHeightRef: { current: 311 },
        latestMeasuredFooterHeightRef: { current: 90 },
      },
      state: { isReadyToOpen: true },
      actions: {
        beginOpenMeasurement: jest.fn(),
        enableLayout,
        completePendingOpen: jest.fn(),
        prepareForClose: jest.fn(),
        reset: jest.fn(),
      },
    },
    originGeometryLeaseRef,
    shared: {
      translateY: shared(0),
      contentHeight: shared(311),
      footerHeight: shared(90),
      active: shared(false),
      animationTravel: shared(0),
      closeGeneration: shared(0),
      surfaceOpacity: shared(0),
      originProgress: shared(1),
      originTargetContentHeight,
    },
    resolveClosedTranslateY: jest.fn(() => 401),
    transition: open ? { open } : undefined,
    onTransitionCompleted,
  };

  const Probe = () => {
    useTrayOpenCloseLifecycle(params);
    return null;
  };

  act(() => {
    create(<Probe />);
  });

  return {
    enableLayout,
    onTransitionCompleted,
    originGeometryLeaseRef,
    originTargetContentHeight,
  };
};

describe("useTrayOpenCloseLifecycle", () => {
  it("publishes the latest snapshot before starting a close", () => {
    const showLatestSnapshot = jest.fn();
    const params = {
      visible: false,
      rootTrayId: "root",
      trayId: "root-two",
      footer: "footer",
      renderState: {
        state: {
          renderedTrayId: "root-one",
          renderedFooter: "footer",
        },
        actions: {
          showLatestSnapshot,
          clear: jest.fn(),
        },
      },
      measurements: {
        shared: {
          resolvedContentHeight: shared(311),
          measuredFooterHeight: shared(90),
        },
        refs: {
          latestResolvedContentHeightRef: { current: 311 },
          latestMeasuredFooterHeightRef: { current: 90 },
        },
        state: { isReadyToOpen: false },
        actions: {
          beginOpenMeasurement: jest.fn(),
          enableLayout: jest.fn(),
          completePendingOpen: jest.fn(),
          prepareForClose: jest.fn(),
          reset: jest.fn(),
        },
      },
      originGeometryLeaseRef: { current: false },
      shared: {
        translateY: shared(0),
        contentHeight: shared(311),
        footerHeight: shared(90),
        active: shared(true),
        animationTravel: shared(401),
        closeGeneration: shared(0),
        surfaceOpacity: shared(1),
        originProgress: shared(1),
        originTargetContentHeight: shared(0),
      },
      resolveClosedTranslateY: jest.fn(() => 401),
      transition: undefined,
    };

    const Probe = () => {
      useTrayOpenCloseLifecycle(params);
      return null;
    };

    act(() => {
      create(<Probe />);
    });

    expect(showLatestSnapshot).toHaveBeenCalledTimes(1);
  });

  it("keeps trigger expansion as the only opening geometry owner", () => {
    const lifecycle = renderOpeningLifecycle("expandFromTrigger");

    expect(lifecycle.enableLayout).not.toHaveBeenCalled();
    expect(lifecycle.originTargetContentHeight.value).toBe(311);
    expect(lifecycle.originGeometryLeaseRef.current).toBe(false);
    expect(lifecycle.onTransitionCompleted).toHaveBeenCalledWith({
      owner: "tray-open",
    });
  });

  it("opens from the trigger on the fitted reference curve", () => {
    mockTimingConfigs.length = 0;
    renderOpeningLifecycle("expandFromTrigger");

    const open = mockTimingConfigs.find((entry) => entry.target === 1);

    expect(open?.config).toEqual({
      duration: 220,
      easing: { bezier: [0.4, 0, 0.2, 1] },
    });
  });

  it("enables layout after a regular sheet opening", () => {
    const lifecycle = renderOpeningLifecycle("slide");

    expect(lifecycle.enableLayout).toHaveBeenCalledTimes(1);
    expect(lifecycle.onTransitionCompleted).toHaveBeenCalledWith({
      owner: "tray-open",
    });
  });
});
