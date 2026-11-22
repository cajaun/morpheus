import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { useTrayDragStyle } from "../use-tray-drag-style";

// the composed transform without a native animation
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
  let style: ReturnType<typeof useTrayDragStyle> | null = null;

  const Probe = () => {
    style = useTrayDragStyle({
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

describe("useTrayDragStyle", () => {
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
