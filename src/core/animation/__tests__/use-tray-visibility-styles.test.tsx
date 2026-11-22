import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "../../constants";
import { useTrayVisibilityStyles } from "../use-tray-visibility-styles";

// reveal and footer grid policy without native interpolation timing
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

// the useAnimatedStyle mock returns plain style objects, read as plain records
type VisibilityStyles = {
  [K in keyof ReturnType<typeof useTrayVisibilityStyles>]: Record<
    string,
    unknown
  >;
};

// a minimal shared value for visibility style probes
const shared = <T,>(value: T) => ({ value });

// visibility styles with one origin configuration
const renderVisibilityStyles = ({
  origin,
}: {
  origin?: "screenBottom" | "fullScreenFooter";
}) => {
  let styles: VisibilityStyles | null = null;

  const Probe = () => {
    styles = useTrayVisibilityStyles({
      originProgress: shared(0),
      shouldUseOriginTransition: true,
      surfaceOpacity: shared(1),
      transition: { open: "expandFromTrigger", origin },
    }) as unknown as typeof styles;

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return styles!;
};

describe("useTrayVisibilityStyles", () => {
  it("starts a fullscreen-footer expansion at the stabilized footer width", () => {
    const styles = renderVisibilityStyles({ origin: "fullScreenFooter" });
    const sheetContentWidth =
      SCREEN_WIDTH -
      HORIZONTAL_MARGIN * 2 -
      TRAY_SHEET_BODY_HORIZONTAL_PADDING * 2;

    expect(styles.footerContentFrameStyle.width).toBe(sheetContentWidth);
  });

  it("preserves the trigger width for ordinary origin expansions", () => {
    const styles = renderVisibilityStyles({});
    const triggerWidth =
      SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

    expect(styles.footerContentFrameStyle.width).toBe(triggerWidth);
  });
});
