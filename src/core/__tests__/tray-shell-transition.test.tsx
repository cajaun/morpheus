import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { Tray } from "../tray";
import type { TrayTransitionContract } from "../../runtime/types";

// Per-step transition values reach the step content through context, so a
// step change re-renders the content's transition consumers in the same
// render while the memoized sheet internals skip.
const mockProbeRecords: Array<{
  generation: number | undefined;
  direction: number;
}> = [];

const MockTransitionProbe = () => {
  const { useTrayTransitionStart } = require("../transition-start");
  const {
    useTrayContentMotionDirection,
  } = require("../transition-motion-direction");
  const start = useTrayTransitionStart();
  mockProbeRecords.push({
    generation: start?.generation,
    direction: useTrayContentMotionDirection(),
  });
  return null;
};

jest.mock("../../telemetry/config", () => ({
  TRAY_INSTRUMENTATION_ENABLED: false,
  TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED: false,
  isTrayInstrumentationEnabled: () => false,
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardController: {
    preload: jest.fn(),
    dismiss: jest.fn(),
  },
  useKeyboardState: () => false,
  useKeyboardAnimation: () => {
    const ReactNative = require("react-native");

    return {
      height: new ReactNative.Animated.Value(0),
      progress: new ReactNative.Animated.Value(0),
    };
  },
  useReanimatedKeyboardAnimation: () => ({
    height: { value: 0 },
  }),
  KeyboardStickyView: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => {
    const ReactNative = require("react-native");
    return <ReactNative.View {...props}>{children}</ReactNative.View>;
  },
}));


jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("../animation/tray-layout", () => ({
  createTrayLayoutTransition: () => undefined,
}));

// Real animated styles are stable useAnimatedStyle handles; mirror that.
let mockAnimatedStyles: Record<string, unknown> = {
  footerSpacerStyle: {},
  trayLayoutStyle: {},
  footerContainerStyle: {},
  contentPaddingStyle: {},
  dragStyle: {},
  surfaceVisibilityStyle: {},
  originSurfaceVisibilityStyle: {},
  footerVisibilityStyle: {},
  fullScreenSurfaceFillStyle: {},
};

jest.mock("../animation/use-tray-animated-styles", () => ({
  useTrayAnimatedStyles: () => mockAnimatedStyles,

}));

jest.mock("../input/use-tray-gesture", () => ({
  useTrayGesture: () => ({}),
}));

jest.mock("../input/use-tray-keyboard", () => ({
  useSheetTrayKeyboard: () => ({ stickyEnabled: false }),
}));

let mockController: unknown = null;

jest.mock("../use-tray-controller", () => ({
  useTrayController: () => {
    if (mockController) {
      // The real controller's layout handlers close over per-step state, so
      // each render hands out new handler identities. Mirror that.
      const controller = mockController as {
        handlers: Record<string, unknown>;
      };

      return {
        ...controller,
        handlers: {
          ...controller.handlers,
          handleContentLayout: jest.fn(),
          handleVisibleFooterLayout: jest.fn(),
          handleShellLayout: jest.fn(),
        },
      };
    }

    const React = require("react");
    const shared = {
      translateY: { value: 0 },
      contentHeight: { value: 0 },
      footerHeight: { value: 0 },
      context: { value: 0 },
      hasFooter: { value: false },
      surfaceOpacity: { value: 1 },
      totalHeight: { value: 0 },
      progress: { value: 1 },
      originProgress: { value: 1 },
      morphProgress: { value: 1 },
      transitionStartedAt: { value: 0 },
      transitionStartedGeneration: { value: 0 },
      transitionLayoutStartedGeneration: { value: 0 },
      transitionCompletedGeneration: { value: 0 },
    };
    mockController = {
      shared,
      state: {
        layoutEnabled: true,
        isSurfaceReady: true,
        renderedHeader: null,
        renderedFooter: null,
        renderedContent: React.createElement(MockTransitionProbe),
        renderedTrayId: "tray",
        renderedFullScreen: false,
        renderedFullScreenSafeAreaTop: false,
        renderedFullScreenDraggable: false,
      },
      handlers: {
        handleContentLayout: jest.fn(),
        handleVisibleFooterLayout: jest.fn(),
        handleShellLayout: jest.fn(),
        handleRequestClose: jest.fn(),
        handleLayoutTransitionConfigured: jest.fn(),
        handleLayoutTransitionStart: jest.fn(),
        handleLayoutTransitionComplete: jest.fn(),
      },
      imperativeApi: {
        open: jest.fn(),
        close: jest.fn(),
        isActive: () => true,
      },
    };
    return mockController;
  },
}));

const contract = (
  generation: number,
  direction: TrayTransitionContract["direction"],
  stepKey: string,
): TrayTransitionContract => ({
  generation,
  reason: direction === "backward" ? "previousStep" : "nextStep",
  direction,
  boundary: "sheetToSheet",
  from: { trayId: "tray", stepIndex: 0, stepKey: "one", mode: "sheet" },
  to: { trayId: "tray", stepIndex: 1, stepKey, mode: "sheet" },
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: false,
  sharedRegions: [],
});

const isInsideSheetSurface = (node: TestRenderer.ReactTestInstance) => {
  let current: TestRenderer.ReactTestInstance | null = node.parent;

  while (current) {
    const type = current.type as { displayName?: string };

    if (typeof current.type !== "string" && type.displayName === "TraySheetSurface") {
      return true;
    }

    current = current.parent;
  }

  return false;
};

describe("Tray shell transition values", () => {
  it("delivers a new step's transition values to content without re-rendering the sheet internals", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    const element = (
      trayId: string,
      transitionContract: TrayTransitionContract,
    ) => (
      <Tray
        visible
        trayId={trayId}
        transitionContract={transitionContract}
        onClose={jest.fn()}
        dismissKeyboard={jest.fn()}
      />
    );

    act(() => {
      renderer = TestRenderer.create(element("one", contract(1, "forward", "one")));
    });

    const findContentMeasureView = () =>
      renderer!.root.find(
        (node) =>
          typeof node.type === "string" &&
          node.props.collapsable === false &&
          typeof node.props.onLayout === "function" &&
          isInsideSheetSurface(node),
      );
    const propsBefore = findContentMeasureView().props;
    const recordsBefore = mockProbeRecords.length;

    act(() => {
      renderer!.update(element("two", contract(2, "backward", "two")));
    });

    // the content consumer received the new clock and direction in this render
    expect(mockProbeRecords.length).toBeGreaterThan(recordsBefore);
    expect(mockProbeRecords[mockProbeRecords.length - 1]).toEqual({
      generation: 2,
      direction: -1,
    });
    // the memoized sheet internals did not re-render for the step change
    // (identity check; host props hold refs that are too large to diff)
    expect(findContentMeasureView().props === propsBefore).toBe(true);
  });

  it("applies a height-lock frame change to the sheet view without re-rendering the sheet internals", () => {
    const { StyleSheet } = require("react-native");
    let renderer: TestRenderer.ReactTestRenderer;
    const transition = contract(3, "forward", "two");
    const element = () => (
      <Tray
        visible
        trayId="two"
        transitionContract={transition}
        onClose={jest.fn()}
        dismissKeyboard={jest.fn()}
      />
    );

    act(() => {
      renderer = TestRenderer.create(element());
    });

    const findContentMeasureView = () =>
      renderer!.root.find(
        (node) =>
          typeof node.type === "string" &&
          node.props.collapsable === false &&
          typeof node.props.onLayout === "function" &&
          isInsideSheetSurface(node),
      );
    const propsBefore = findContentMeasureView().props;
    const lockedFrame = { height: 312 };

    // the frame lock engages: only presentationFrameStyle changes
    mockAnimatedStyles = { ...mockAnimatedStyles, presentationFrameStyle: lockedFrame };
    act(() => {
      renderer!.update(element());
    });

    const lockedSheet = renderer!.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        StyleSheet.flatten(node.props.style)?.height === 312,
    );

    expect(lockedSheet.length).toBeGreaterThan(0);
    expect(findContentMeasureView().props === propsBefore).toBe(true);
  });
});
