import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_VERTICAL_PADDING,
} from "../../constants";
import { useActionTrayVisibilityStyles } from "../use-action-tray-visibility-styles";

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

type VisibilityStyles = ReturnType<typeof useActionTrayVisibilityStyles>;

const shared = <T,>(value: T) => ({ value });

const renderVisibilityStyles = ({
  origin,
}: {
  origin?: "screenBottom" | "fullScreenFooter";
}) => {
  let styles: VisibilityStyles | null = null;

  const Probe = () => {
    styles = useActionTrayVisibilityStyles({
      fullScreen: false,
      hasFooter: shared(true),
      originProgress: shared(0),
      shouldUseOriginTransition: true,
      surfaceOpacity: shared(1),
      transition: { open: "expandFromTrigger", origin },
      visible: true,
    });

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return styles!;
};

describe("useActionTrayVisibilityStyles", () => {
  it("starts a fullscreen-footer expansion at the stabilized footer width", () => {
    const styles = renderVisibilityStyles({ origin: "fullScreenFooter" });
    const sheetContentWidth =
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - TRAY_VERTICAL_PADDING * 2;

    expect(styles.footerContentFrameStyle.width).toBe(sheetContentWidth);
  });

  it("preserves the trigger width for ordinary origin expansions", () => {
    const styles = renderVisibilityStyles({});
    const triggerWidth =
      SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

    expect(styles.footerContentFrameStyle.width).toBe(triggerWidth);
  });
});
