import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { Tray } from "../tray";

// shell rendering with native animation modules replaced by stable hosts
const mockCloseHandler = jest.fn();
const mockFooterLayoutHandler = jest.fn();
const mockContentLayoutHandler = jest.fn();

jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardController: {
    preload: jest.fn(),
    dismiss: jest.fn(),
  },
  useKeyboardState: () => false,
  useGenericKeyboardHandler: jest.fn(),
  useKeyboardAnimation: () => {
    const ReactNative = require("react-native");

    return {
      height: new ReactNative.Animated.Value(0),
      progress: new ReactNative.Animated.Value(0),
    };
  },
  useReanimatedKeyboardAnimation: () => ({
    height: { value: 0 },
    progress: { value: 0 },
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

// the opt-in synchronous content measurement path
jest.mock("../../telemetry/config", () => ({
  ...(jest.requireActual("../../telemetry/config") as object),
  TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED: true,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("../animation/tray-layout", () => ({
  createTrayLayoutTransition: () => undefined,
  createTrayLayoutFollowerTransition: () => undefined,
}));

jest.mock("../animation/use-tray-animated-styles", () => ({
  useTrayAnimatedStyles: () => ({
    footerSpacerStyle: {},
    trayLayoutStyle: {},
    footerContainerStyle: {},
    contentPaddingStyle: {},
    dragStyle: {},
    surfaceVisibilityStyle: {},
    originSurfaceVisibilityStyle: {},
    footerVisibilityStyle: {},
    fullScreenSurfaceFillStyle: {},
  }),
}));

jest.mock("../input/use-tray-gesture", () => ({
  useTrayGesture: () => ({}),
}));

jest.mock("../input/use-tray-keyboard", () => ({
  useSheetTrayKeyboard: () => ({ stickyEnabled: false }),
}));

jest.mock("../use-tray-controller", () => ({
  useTrayController: () => {
    const ReactNative = require("react-native");

    return {
      shared: {
        translateY: { value: 0 },
        contentHeight: { value: 0 },
        footerHeight: { value: 0 },
        context: { value: 0 },
        hasFooter: { value: true },
        surfaceOpacity: { value: 1 },
        totalHeight: { value: 0 },
        progress: { value: 1 },
        originProgress: { value: 1 },
        morphProgress: { value: 1 },
        transitionStartedAt: { value: 0 },
        transitionStartedGeneration: { value: 0 },
        transitionLayoutStartedGeneration: { value: 0 },
        transitionCompletedGeneration: { value: 0 },
      },
      state: {
        layoutEnabled: false,
        isSurfaceReady: true,
        renderedHeader: null,
        renderedFooter: "Tray footer",
        renderedContent: <ReactNative.Text>Tray content</ReactNative.Text>,
        renderedTrayId: "tray",
        renderedFullScreen: false,
        renderedFullScreenSafeAreaTop: false,
        renderedFullScreenDraggable: false,
        renderedContainerStyle: undefined,
        renderedClassName: undefined,
        renderedFooterStyle: undefined,
      },
      handlers: {
        handleContentLayout: mockContentLayoutHandler,
        handleVisibleFooterLayout: mockFooterLayoutHandler,
        handleShellLayout: jest.fn(),
        handleRequestClose: mockCloseHandler,
      },
      imperativeApi: {
        open: jest.fn(),
        close: jest.fn(),
        isActive: () => true,
      },
    };
  },
}));

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

describe("Tray", () => {
  it("keeps the fixed footer layer mounted outside the animated shell", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Tray
          visible
          onClose={jest.fn()}
          dismissKeyboard={jest.fn()}
        />,
      );
    });

    const footer = renderer!.root.find(
      (node) =>
        node.props.pointerEvents === "auto" &&
        typeof node.props.onLayout === "function",
    );

    expect(footer).toBeDefined();
    expect(isInsideSheetSurface(footer)).toBe(false);
    expect(footer.props.pointerEvents).toBe("auto");

    footer.props.onLayout({
      nativeEvent: { layout: { height: 64, width: 320, x: 0, y: 0 } },
    });
    expect(mockFooterLayoutHandler).toHaveBeenCalled();
  });

  it("keeps the backdrop interactive when visible and not dismissible", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Tray
          visible
          dismissible={false}
          onClose={jest.fn()}
          dismissKeyboard={jest.fn()}
        />,
      );
    });

    const backdropPressable = renderer!.root.findAll(
      (node) => typeof node.props.onPress === "function",
    )[0];

    expect(backdropPressable.props.pointerEvents).toBe("auto");

    backdropPressable.props.onPress();
    expect(mockCloseHandler).not.toHaveBeenCalled();
  });

  it("measures committed content in the same commit instead of waiting for onLayout", () => {
    mockContentLayoutHandler.mockClear();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Tray visible onClose={jest.fn()} dismissKeyboard={jest.fn()} />,
      );
    });

    const contentMeasureView = renderer!.root.find(
      (node) =>
        node.props.collapsable === false &&
        typeof node.props.onLayout === "function" &&
        isInsideSheetSurface(node) &&
        node.instance != null &&
        typeof node.instance.measure === "function",
    );
    const measure = contentMeasureView.instance.measure as jest.Mock;

    // the layout effect asked for a measurement during the mount commit
    expect(measure).toHaveBeenCalled();
    expect(mockContentLayoutHandler).not.toHaveBeenCalled();

    // Fabric answers synchronously and the result flows through the onLayout path
    const callback = measure.mock.calls[0]![0] as (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => void;
    callback(0, 0, 320, 184);

    expect(mockContentLayoutHandler).toHaveBeenCalledWith({
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 184 } },
    });
  });
});
