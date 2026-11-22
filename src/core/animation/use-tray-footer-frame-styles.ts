import { interpolate, useAnimatedStyle } from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_VERTICAL_PADDING,
} from "../constants";
import { resolveBoundaryProgress } from "./frame-style-math";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT,
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING,
  type TrayFrameStyleParams,
} from "./frame-style-params";

// frames of the fixed footer layer and the step footer layer
export const useTrayFooterFrameStyles = (
  params: TrayFrameStyleParams,
  {
    collapsedBottomInset,
    targetBottomInset,
    originBottomAnchor,
  }: {
    collapsedBottomInset: number;
    targetBottomInset: number;
    originBottomAnchor: number;
  },
) => {
  const {
    bottom,
    footerHeight,
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreen,
    hasFooter,
    morphProgress,
    originProgress,
    shouldUseOriginTransition,
    surfaceOpacity,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  } = params;

  // the step footer layer follows the sheet's horizontal inset and bottom edge across a fullscreen boundary like the fixed footer, its visibility is the surface's own
  const stepFooterContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const footerBottom = HORIZONTAL_MARGIN + targetBottomInset;

    if (fullScreenBoundaryTransition) {
      const sourceFullScreen =
        fullScreenBoundarySourceFullScreen ?? !fullScreen;
      const targetFullScreen = fullScreenBoundaryTargetFullScreen ?? fullScreen;
      const sourceLeft = sourceFullScreen ? 0 : HORIZONTAL_MARGIN;
      const targetBoundaryLeft = targetFullScreen ? 0 : HORIZONTAL_MARGIN;
      const progress = resolveBoundaryProgress(
        morphProgress.value,
        transitionGeneration,
        transitionStartedGeneration?.value,
        transitionLayoutStartedGeneration?.value,
        transitionCompletedGeneration?.value,
        fullScreenBoundaryTransition,
      );
      const left = interpolate(
        progress,
        [0, 1],
        [sourceLeft, targetBoundaryLeft],
      );

      return {
        left,
        right: left,
        bottom: footerBottom,
        borderBottomLeftRadius: BORDER_RADIUS,
        borderBottomRightRadius: BORDER_RADIUS,
      };
    }

    return {
      left: targetLeft,
      right: targetLeft,
      bottom: footerBottom,
      borderBottomLeftRadius: BORDER_RADIUS,
      borderBottomRightRadius: BORDER_RADIUS,
    };
  }, [
    fullScreen,
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    morphProgress,
    targetBottomInset,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const resolvedFooterBottom = shouldUseOriginTransition
      ? originBottomAnchor + targetBottomInset
      : HORIZONTAL_MARGIN + targetBottomInset;
    const targetRadius = BORDER_RADIUS;
    const footerOpacity = hasFooter.value ? surfaceOpacity.value : 0;

    if (shouldUseOriginTransition) {
      // origin expansion is the footer's own presentation transition, step changes never reach this branch
      const progress = originProgress.value;
      const revealProgress = progress * progress;
      const currentHorizontalInset = interpolate(
        revealProgress,
        [0, 1],
        [EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET, TRAY_VERTICAL_PADDING],
      );
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentLeft = interpolate(
        progress,
        [0, 1],
        [EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN, targetLeft],
      );
      const currentWidth = interpolate(
        progress,
        [0, 1],
        [
          SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2,
          targetWidth,
        ],
      );
      const targetFooterHeight = EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT;
      const targetTop =
        SCREEN_HEIGHT - resolvedFooterBottom - targetFooterHeight;
      const collapsedTop =
        SCREEN_HEIGHT -
        (originBottomAnchor + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        opacity: footerOpacity,
        left: currentLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: currentWidth,
        height: interpolate(
          progress,
          [0, 1],
          [EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT, targetFooterHeight],
        ),
        paddingHorizontal: 0,
        paddingLeft: currentHorizontalInset,
        paddingRight: currentHorizontalInset,
        paddingTop: interpolate(
          revealProgress,
          [0, 1],
          [0, EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING],
        ),
        paddingBottom: interpolate(
          revealProgress,
          [0, 1],
          [0, TRAY_FOOTER_PADDING_BOTTOM],
        ),
        right: "auto",
        bottom: "auto",
        borderTopLeftRadius: interpolate(
          progress,
          [0, 1],
          [EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS, 0],
        ),
        borderTopRightRadius: interpolate(
          progress,
          [0, 1],
          [EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS, 0],
        ),
        borderBottomLeftRadius: interpolate(
          progress,
          [0, 1],
          [EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS, targetRadius],
        ),
        borderBottomRightRadius: interpolate(
          progress,
          [0, 1],
          [EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS, targetRadius],
        ),
      };
    }

    if (fullScreenBoundaryTransition) {
      const sourceFullScreen =
        fullScreenBoundarySourceFullScreen ?? !fullScreen;
      const targetFullScreen = fullScreenBoundaryTargetFullScreen ?? fullScreen;
      const sourceLeft = sourceFullScreen ? 0 : HORIZONTAL_MARGIN;
      const targetBoundaryLeft = targetFullScreen ? 0 : HORIZONTAL_MARGIN;
      const progress = resolveBoundaryProgress(
        morphProgress.value,
        transitionGeneration,
        transitionStartedGeneration?.value,
        transitionLayoutStartedGeneration?.value,
        transitionCompletedGeneration?.value,
        fullScreenBoundaryTransition,
      );
      // the detached footer keeps one bottom anchor through the boundary transition
      const sourceBottom = resolvedFooterBottom;
      const targetBoundaryBottom = resolvedFooterBottom;

      return {
        opacity: footerOpacity,
        // the detached footer follows the shell clock when the presentation mode changes
        left: interpolate(progress, [0, 1], [sourceLeft, targetBoundaryLeft]),
        right: interpolate(progress, [0, 1], [sourceLeft, targetBoundaryLeft]),
        bottom: interpolate(
          progress,
          [0, 1],
          [sourceBottom, targetBoundaryBottom],
        ),
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: targetRadius,
        borderBottomRightRadius: targetRadius,
      };
    }

    return {
      opacity: footerOpacity,
      // fixed footers keep their screen position across step changes while the shell changes height
      left: targetLeft,
      right: targetRight,
      bottom: resolvedFooterBottom,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: targetRadius,
      borderBottomRightRadius: targetRadius,
    };
  }, [
    bottom,
    collapsedBottomInset,
    footerHeight,
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreen,
    hasFooter,
    morphProgress,
    originProgress,
    originBottomAnchor,
    shouldUseOriginTransition,
    surfaceOpacity,
    targetBottomInset,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

  return { stepFooterContainerStyle, footerContainerStyle };
};
