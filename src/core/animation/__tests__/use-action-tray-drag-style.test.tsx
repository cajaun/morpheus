import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { useActionTrayDragStyle } from "../use-action-tray-drag-style";

// probe the composed transform without starting a native animation
jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");

  return {
    ...Reanimated,
    useAnimatedStyle: (updater: () => object) => updater(),
  };
});

const shared = <T,>(value: T) => ({ value });

const renderDragStyle = ({
  originProgress = 1,
  shouldUseOriginTransition = false,
  translateY,
}: {
  originProgress?: number;
  shouldUseOriginTransition?: boolean;
  translateY: number;
}) => {
  let style: ReturnType<typeof useActionTrayDragStyle> | null = null;

  const Probe = () => {
    style = useActionTrayDragStyle({
      originProgress: shared(originProgress),
      shouldUseOriginTransition,
      translateY: shared(translateY),
    });

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return style!;
};

describe("useActionTrayDragStyle", () => {
  it("preserves ordinary tray drag travel", () => {
    expect(
      renderDragStyle({
        translateY: 24,
      }),
    ).toEqual({ transform: [{ translateY: 24 }] });
  });

  it("preserves trigger-origin drag progress", () => {
    expect(
      renderDragStyle({
        originProgress: 0.5,
        shouldUseOriginTransition: true,
        translateY: 24,
      }),
    ).toEqual({ transform: [{ translateY: 12 }] });
  });

  it("preserves the existing transform when the keyboard is closed", () => {
    expect(
      renderDragStyle({
        originProgress: 0.5,
        shouldUseOriginTransition: true,
        translateY: 24,
      }),
    ).toEqual({ transform: [{ translateY: 12 }] });
  });
});
