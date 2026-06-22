import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { BORDER_RADIUS, SCREEN_HEIGHT } from "../../constants";
import { useActionTrayFrameStyles } from "../use-action-tray-frame-styles";

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");

  return {
    ...Reanimated,
    interpolate: (
      value: number,
      input: readonly number[],
      output: readonly number[],
    ) => (value >= input[input.length - 1] ? output[output.length - 1] : output[0]),
    useAnimatedStyle: (updater: () => object) => updater(),
  };
});

type FrameStyles = ReturnType<typeof useActionTrayFrameStyles>;

const shared = <T,>(value: T) => ({ value });

const renderFrameStyles = ({
  fullScreen = false,
  preparedSheetFrameHeight,
  shouldUseOriginTransition = false,
  useMeasuredSheetHeight = false,
}: {
  fullScreen?: boolean;
  preparedSheetFrameHeight?: number;
  shouldUseOriginTransition?: boolean;
  useMeasuredSheetHeight?: boolean;
}) => {
  let styles: FrameStyles | null = null;

  const Probe = () => {
    styles = useActionTrayFrameStyles({
      bottom: 20,
      contentHeight: shared(320),
      footerHeight: shared(80),
      fullScreen,
      hasFooter: shared(true),
      keyboardHeight: shared(0),
      originProgress: shared(1),
      preparedSheetFrameHeight,
      shouldUseOriginTransition,
      transition: shouldUseOriginTransition
        ? { open: "expandFromTrigger" }
        : undefined,
      useMeasuredSheetHeight,
    });

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return styles!;
};

describe("useActionTrayFrameStyles", () => {
  it("lets an opened sheet derive height from its children", () => {
    const styles = renderFrameStyles({});

    expect(styles.trayLayoutStyle.height).toBeUndefined();
  });

  it("keeps fullscreen geometry explicit", () => {
    const styles = renderFrameStyles({ fullScreen: true });

    expect(styles.trayLayoutStyle.height).toBe(SCREEN_HEIGHT);
    expect(styles.trayLayoutStyle.borderRadius).toBe(BORDER_RADIUS);
    expect(styles.presentationFrameStyle?.height).toBe(SCREEN_HEIGHT);
    expect(styles.footerContainerStyle.borderTopLeftRadius).toBe(0);
    expect(styles.footerContainerStyle.borderTopRightRadius).toBe(0);
    expect(styles.footerContainerStyle.borderBottomLeftRadius).toBe(
      BORDER_RADIUS,
    );
    expect(styles.footerContainerStyle.borderBottomRightRadius).toBe(
      BORDER_RADIUS,
    );
  });

  it("uses measured sheet geometry while returning from fullscreen", () => {
    const styles = renderFrameStyles({
      preparedSheetFrameHeight: 400,
      useMeasuredSheetHeight: true,
    });

    expect(styles.trayLayoutStyle.height).toBe(400);
    expect(styles.presentationFrameStyle?.height).toBe(400);
  });

  it("keeps an explicit interpolated height during origin expansion", () => {
    const styles = renderFrameStyles({ shouldUseOriginTransition: true });

    expect(typeof styles.trayLayoutStyle.height).toBe("number");
    expect(styles.trayLayoutStyle.height).toBeGreaterThan(320);
  });
});
