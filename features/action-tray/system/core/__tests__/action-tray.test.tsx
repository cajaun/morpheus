import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { ActionTray } from "../action-tray";

const mockCloseHandler = jest.fn();

jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-keyboard-controller", () => ({
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

jest.mock("../animation/action-tray-layout", () => ({
  createTrayLayoutTransition: () => undefined,
}));

jest.mock("../animation/use-action-tray-animated-styles", () => ({
  useActionTrayAnimatedStyles: () => ({
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

jest.mock("../input/use-action-tray-gesture", () => ({
  useActionTrayGesture: () => ({}),
}));

jest.mock("../use-action-tray-controller", () => ({
  useActionTrayController: () => {
    const ReactNative = require("react-native");

    return {
      shared: {
        translateY: { value: 0 },
        contentHeight: { value: 0 },
        footerHeight: { value: 0 },
        context: { value: 0 },
        hasFooter: { value: false },
        surfaceOpacity: { value: 1 },
        totalHeight: { value: 0 },
        progress: { value: 1 },
        originProgress: { value: 1 },
      },
      state: {
        layoutEnabled: false,
        isSurfaceReady: true,
        renderedHeader: null,
        renderedFooter: null,
        renderedContent: <ReactNative.Text>Tray content</ReactNative.Text>,
        renderedTrayId: "tray",
        renderedFullScreen: false,
        renderedFullScreenSafeAreaTop: false,
        renderedFullScreenDraggable: false,
        renderedContainerStyle: undefined,
        renderedClassName: undefined,
        renderedFooterStyle: undefined,
        renderedFooterClassName: undefined,
        measureFooter: null,
      },
      handlers: {
        handleContentLayout: jest.fn(),
        handleVisibleFooterLayout: jest.fn(),
        handleMeasureFooterLayout: jest.fn(),
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

describe("ActionTray", () => {
  it("keeps the backdrop interactive when visible and not dismissible", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ActionTray
          visible
          dismissible={false}
          onClose={jest.fn()}
          keyboardHeight={{ value: 0 } as never}
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
});
