// the footer's frame while a tray grows out of its trigger or collapses back into it
import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
} from "../../constants";
import { EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT } from "../frame-style-params";
import { useTrayFooterFrameStyles } from "../use-tray-footer-frame-styles";

// a linear interpolate and plain style objects so mid-transition geometry is readable
jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<object>("react-native-reanimated/mock"),
  interpolate: (
    value: number,
    input: readonly number[],
    output: readonly number[],
  ) => {
    const t = (value - input[0]) / (input[1] - input[0]);
    return output[0] + (output[1] - output[0]) * Math.min(1, Math.max(0, t));
  },
  useAnimatedStyle: (updater: () => object) => updater(),
}));

const shared = <T,>(value: T) => ({ value });

const renderOriginFooter = (originProgress: number) => {
  let styles: Record<string, Record<string, number>> | null = null;

  const Probe = () => {
    styles = useTrayFooterFrameStyles(
      {
        bottom: 34,
        contentHeight: shared(300),
        footerHeight: shared(EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT),
        surfaceOpacity: shared(1),
        fullScreen: false,
        fullScreenBoundaryTransition: false,
        hasFooter: shared(true),
        morphProgress: shared(1),
        originProgress: shared(originProgress),
        originTargetContentHeight: shared(300),
        shouldUseOriginTransition: true,
        transition: { open: "expandFromTrigger" },
        transitionStartedGeneration: shared(0),
        transitionLayoutStartedGeneration: shared(0),
        transitionCompletedGeneration: shared(0),
      } as never,
      { collapsedBottomInset: 2, targetBottomInset: 0, originBottomAnchor: 34 },
    ) as never;

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return styles!;
};

describe("useTrayFooterFrameStyles origin expansion", () => {
  it("keeps an even ring above and below the controls at every point of the morph", () => {
    for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
      const { footerContainerStyle } = renderOriginFooter(progress);
      const controlsHeight = EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;
      const below =
        footerContainerStyle.height -
        footerContainerStyle.paddingTop -
        controlsHeight;

      // the space under the controls is the bottom padding, never leftover frame growth
      expect(below).toBeCloseTo(footerContainerStyle.paddingBottom, 5);
      expect(footerContainerStyle.paddingTop).toBeCloseTo(
        TRAY_FOOTER_PADDING_TOP * progress,
        5,
      );
      expect(footerContainerStyle.paddingBottom).toBeCloseTo(
        TRAY_FOOTER_PADDING_BOTTOM * progress,
        5,
      );
    }
  });

  it("starts the backing and its fade at the controls' top edge throughout the morph", () => {
    const { footerContainerStyle, footerBackingFrameStyle, footerBackingFadeStyle } =
      renderOriginFooter(0.5);

    expect(footerBackingFrameStyle.height).toBeCloseTo(
      footerContainerStyle.height - footerContainerStyle.paddingTop,
      5,
    );
    // the fade fills the open top padding and overlaps the backing by a point
    expect(footerBackingFadeStyle.height).toBeCloseTo(
      footerContainerStyle.paddingTop + 1,
      5,
    );
  });
});
