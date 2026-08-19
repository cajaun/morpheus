import {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  FULL_SCREEN_HEADER_BOTTOM_GAP,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "../constants";
import type {
  ActionTrayAnimatedStyleParams,
  ActionTrayAnimationState,
} from "./action-tray-animated-style-types";

const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING =
  TRAY_FOOTER_PADDING_TOP;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT +
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING +
  TRAY_FOOTER_PADDING_BOTTOM;

type Params = Pick<
  ActionTrayAnimatedStyleParams,
  | "contentHeight"
  | "footerHeight"
  | "fullScreenBoundaryTransition"
  | "fullScreenBoundarySourceFullScreen"
  | "fullScreenBoundaryTargetFullScreen"
  | "hasFooter"
  | "keyboardHeight"
  | "transitionStartedGeneration"
  | "transitionLayoutStartedGeneration"
  | "transitionCompletedGeneration"
  | "transition"
> &
  ActionTrayAnimationState;

const resolveBoundaryProgress = (
  progress: number,
  transitionGeneration: number | undefined,
  transitionStartedGeneration: number | undefined,
  transitionLayoutStartedGeneration: number | undefined,
  transitionCompletedGeneration: number | undefined,
  fullScreenBoundaryTransition: boolean,
) => {
  "worklet";

  if (
    !fullScreenBoundaryTransition ||
    transitionGeneration === undefined ||
    transitionGeneration <= 0
  ) {
    return progress;
  }

  // morphProgress survives a completed fullscreen pass. A new generation
  // must use its source frame until the shared transition clock starts.
  if ((transitionCompletedGeneration ?? 0) >= transitionGeneration) {
    return 1;
  }

  // The incoming content publishes this clock first. Boundary geometry is
  // driven by morphProgress, not native layout animation, so waiting for the
  // later native layout callback creates a visible content-before-shell gap.
  if ((transitionStartedGeneration ?? 0) < transitionGeneration) {
    return 0;
  }

  return progress;
};

export const useActionTrayFrameStyles = ({
  bottom,
  contentHeight,
  footerHeight,
  fullScreenBoundaryTransition,
  fullScreenBoundarySourceFullScreen,
  fullScreenBoundaryTargetFullScreen,
  fullScreen,
  hasFooter,
  keyboardHeight,
  morphProgress,
  originProgress,
  preparedSheetFrameHeight,
  preparedSheetFrameGeneration,
  shouldUseOriginTransition,
  transition,
  transitionGeneration,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  useMeasuredSheetHeight,
}: Params) => {
  // footer-origin transitions begin at the footer edge instead of screen bottom
  const collapsedBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_FOOTER_PADDING_BOTTOM
      : EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter" ? collapsedBottomInset : 0;
  const hasPreparedSheetFrame =
    preparedSheetFrameHeight !== undefined &&
    (transitionGeneration === undefined ||
      preparedSheetFrameGeneration === transitionGeneration);
  // Concrete frame props are useful for stable snapshots, but they would
  // override the native layout clock during a fullscreen boundary. Let the
  // boundary layout own the shell frame and let its absolute footer child
  // follow that frame naturally.
  const presentationFrameStyle =
    !fullScreenBoundaryTransition && fullScreen
    ? {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
      }
    : !fullScreenBoundaryTransition &&
        useMeasuredSheetHeight &&
        hasPreparedSheetFrame
      ? {
          left: HORIZONTAL_MARGIN,
          right: HORIZONTAL_MARGIN,
          top: "auto" as const,
          bottom: bottom + targetBottomInset,
          height: preparedSheetFrameHeight,
        }
      : undefined;

  const footerSpacerStyle = useAnimatedStyle(() => ({
    // The absolute footer does not participate in layout, so the body still
    // reserves its measured space when the shell derives its sheet height.
    height: hasFooter.value
      ? shouldUseOriginTransition
        ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
        : footerHeight.value
      : 0,
  }));

  const trayLayoutStyle = useAnimatedStyle(() => {
    const resolvedFooterHeight = hasFooter.value
      ? shouldUseOriginTransition
        ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
        : footerHeight.value
      : 0;
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? Math.max(0, contentHeight.value + resolvedFooterHeight)
        : undefined;
    const boundarySheetFrameHeight =
      fullScreenBoundaryTransition &&
      !fullScreen &&
      hasPreparedSheetFrame
        ? preparedSheetFrameHeight
        : resolvedSheetHeight;
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom = fullScreen ? 0 : bottom + targetBottomInset;
    // keep the same rounded shell while fullscreen expands the frame
    const targetRadius = BORDER_RADIUS;
    const targetTop = fullScreen
      ? 0
      : boundarySheetFrameHeight === undefined
        ? undefined
        : SCREEN_HEIGHT - targetBottom - boundarySheetFrameHeight;
    const shouldLeaseBoundarySheetFrame =
      fullScreenBoundaryTransition &&
      !fullScreen &&
      boundarySheetFrameHeight !== undefined;

    if (fullScreenBoundaryTransition) {
      const sourceFullScreen =
        fullScreenBoundarySourceFullScreen ?? !fullScreen;
      const targetFullScreen =
        fullScreenBoundaryTargetFullScreen ?? fullScreen;
      // The shell owns the full presentation geometry and reaches viewport
      // bottom in fullscreen; the detached footer has its own fixed vertical
      // policy below.
      const sourceBottom = sourceFullScreen
        ? 0
        : bottom + targetBottomInset;
      const targetBoundaryBottom = targetFullScreen
        ? 0
        : bottom + targetBottomInset;
      const sourceHeight = sourceFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? preparedSheetFrameHeight
          : resolvedSheetHeight ?? 0;
      const targetHeight = targetFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? preparedSheetFrameHeight
          : resolvedSheetHeight ?? 0;
      const sourceLeft = sourceFullScreen ? 0 : HORIZONTAL_MARGIN;
      const targetBoundaryLeft = targetFullScreen ? 0 : HORIZONTAL_MARGIN;
      const sourceTop = sourceFullScreen
        ? 0
        : SCREEN_HEIGHT - sourceBottom - sourceHeight;
      const targetBoundaryTop = targetFullScreen
        ? 0
        : SCREEN_HEIGHT - targetBoundaryBottom - targetHeight;
      const progress = resolveBoundaryProgress(
        morphProgress.value,
        transitionGeneration,
        transitionStartedGeneration?.value,
        transitionLayoutStartedGeneration?.value,
        transitionCompletedGeneration?.value,
        fullScreenBoundaryTransition,
      );

      // Fullscreen boundaries use one explicit clock. This keeps the shell's
      // visible frame from waiting on native layout while content and footer
      // have already begun reacting to the new presentation mode.
      return {
        left: interpolate(
          progress,
          [0, 1],
          [sourceLeft, targetBoundaryLeft],
        ),
        width: interpolate(
          progress,
          [0, 1],
          [SCREEN_WIDTH - sourceLeft * 2, SCREEN_WIDTH - targetBoundaryLeft * 2],
        ),
        top: interpolate(progress, [0, 1], [sourceTop, targetBoundaryTop]),
        height: interpolate(progress, [0, 1], [sourceHeight, targetHeight]),
        bottom: "auto",
        right: "auto",
        borderRadius: targetRadius,
      };
    }

    if (shouldUseOriginTransition && targetTop !== undefined) {
      // trigger expansion owns left width top height and radius as one interpolation
      const progress = originProgress.value;
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentLeft = interpolate(progress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
        targetLeft,
      ]);
      const currentWidth = interpolate(progress, [0, 1], [
        SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2,
        targetWidth,
      ]);
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: currentLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: currentWidth,
        height: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
          boundarySheetFrameHeight ?? EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
        ]),
        bottom: "auto",
        right: "auto",
        borderRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
      };
    }

    return {
      left: targetLeft,
      right: targetRight,
      // Boundary and origin branches animate an explicit width. Clear it when
      // the sheet returns to left/right ownership so a recycled host cannot
      // retain a fullscreen-sized frame on the next step.
      width: "auto",
      // Keep the sheet bottom-anchored while its intrinsic height is leased.
      // Switching from bottom+height to top+height creates a visible vertical
      // snap before the native fullscreen layout clock can take over.
      bottom: targetBottom,
      top: fullScreen ? 0 : "auto",
      // let regular sheets derive geometry from children
      height: fullScreen
        ? SCREEN_HEIGHT
        : shouldLeaseBoundarySheetFrame || useMeasuredSheetHeight
          ? boundarySheetFrameHeight
          // restore yoga height ownership after concrete fullscreen heights
          : "auto",
      borderRadius: targetRadius,
    };
  }, [
    bottom,
    collapsedBottomInset,
    contentHeight,
    fullScreen,
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    originProgress,
    preparedSheetFrameHeight,
    preparedSheetFrameGeneration,
    shouldUseOriginTransition,
    targetBottomInset,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
    useMeasuredSheetHeight,
  ]);

  const contentFrameStyle = useAnimatedStyle(() => {
    if (!fullScreenBoundaryTransition) {
      // Reanimated can retain boundary properties on a recycled native view.
      // Return the complete neutral sheet frame instead of relying on
      // `undefined` to remove position/width values. Otherwise the outer frame
      // stays absolute and the footer spacer becomes the only shell layout.
      return {
        position: "relative",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: "auto",
        alignSelf: "stretch",
        flex: fullScreen ? 1 : 0,
      };
    }

    const targetFullScreen =
      fullScreenBoundaryTargetFullScreen ?? fullScreen;

    return {
      // Boundary content is a viewport layer, not shell layout input. The
      // shell owns the interpolated frame and clips this stable target-width
      // layer while it morphs. This prevents a fullscreen flex body from
      // collapsing the source sheet when the outgoing body exits.
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: targetFullScreen
        ? SCREEN_WIDTH
        : SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
      alignSelf: "flex-start",
    };
  }, [
    fullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    morphProgress,
  ]);

  const headerFrameStyle = useAnimatedStyle(() => {
    if (!fullScreenBoundaryTransition) {
      return {
        paddingBottom: fullScreen ? FULL_SCREEN_HEADER_BOTTOM_GAP : 0,
      };
    }

    const sourceFullScreen =
      fullScreenBoundarySourceFullScreen ?? !fullScreen;
    const targetFullScreen =
      fullScreenBoundaryTargetFullScreen ?? fullScreen;
    const progress = resolveBoundaryProgress(
      morphProgress.value,
      transitionGeneration,
      transitionStartedGeneration?.value,
      transitionLayoutStartedGeneration?.value,
      transitionCompletedGeneration?.value,
      fullScreenBoundaryTransition,
    );

    return {
      // Header spacing is content geometry, so it must use the same clock as
      // the shell instead of switching when the React snapshot commits.
      paddingBottom: interpolate(
        progress,
        [0, 1],
        [
          sourceFullScreen ? FULL_SCREEN_HEADER_BOTTOM_GAP : 0,
          targetFullScreen ? FULL_SCREEN_HEADER_BOTTOM_GAP : 0,
        ],
      ),
    };
  }, [
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    morphProgress,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

  const footerContainerStyle = useAnimatedStyle(() => {
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const resolvedFooterBottom =
      !shouldUseOriginTransition && keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom + targetBottomInset;
    const targetRadius = BORDER_RADIUS;

    if (shouldUseOriginTransition) {
      // Origin expansion is the footer's own presentation transition; regular
      // step changes never enter this branch.
      const progress = originProgress.value;
      const revealProgress = progress * progress;
      const currentHorizontalInset = interpolate(revealProgress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
        TRAY_VERTICAL_PADDING,
      ]);
      const targetWidth = SCREEN_WIDTH - targetLeft - targetRight;
      const currentLeft = interpolate(progress, [0, 1], [
        EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
        targetLeft,
      ]);
      const currentWidth = interpolate(progress, [0, 1], [
        SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2,
        targetWidth,
      ]);
      const targetFooterHeight = EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT;
      const targetTop =
        SCREEN_HEIGHT - resolvedFooterBottom - targetFooterHeight;
      const collapsedTop =
        SCREEN_HEIGHT -
        (bottom + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        left: currentLeft,
        top: interpolate(progress, [0, 1], [collapsedTop, targetTop]),
        width: currentWidth,
        height: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
          targetFooterHeight,
        ]),
        paddingHorizontal: 0,
        paddingLeft: currentHorizontalInset,
        paddingRight: currentHorizontalInset,
        paddingTop: interpolate(revealProgress, [0, 1], [
          0,
          EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING,
        ]),
        paddingBottom: interpolate(revealProgress, [0, 1], [
          0,
          TRAY_FOOTER_PADDING_BOTTOM,
        ]),
        right: "auto",
        bottom: "auto",
        borderTopLeftRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          0,
        ]),
        borderTopRightRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          0,
        ]),
        borderBottomLeftRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
        borderBottomRightRadius: interpolate(progress, [0, 1], [
          EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
          targetRadius,
        ]),
      };
    }

    if (fullScreenBoundaryTransition) {
      const sourceFullScreen =
        fullScreenBoundarySourceFullScreen ?? !fullScreen;
      const targetFullScreen =
        fullScreenBoundaryTargetFullScreen ?? fullScreen;
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
      // The shell reaches viewport bottom in fullscreen, but this footer is a
      // detached fixed layer. Its fullscreen frame is still anchored at the
      // safe-area bottom, which is also the sheet frame's settled anchor.
      // Using the shell's bottom (0) here creates a one-frame drop on return.
      const sourceBottom = resolvedFooterBottom;
      const targetBoundaryBottom = resolvedFooterBottom;

      return {
        // The footer is detached from ordinary content layout, but follows the
        // same explicit shell clock when the presentation mode changes.
        left: interpolate(
          progress,
          [0, 1],
          [sourceLeft, targetBoundaryLeft],
        ),
        right: interpolate(
          progress,
          [0, 1],
          [sourceLeft, targetBoundaryLeft],
        ),
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
      // Fixed footers stay at the same screen position during ordinary step
      // changes even when the content shell changes height.
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
    keyboardHeight,
    morphProgress,
    originProgress,
    shouldUseOriginTransition,
    targetBottomInset,
    transitionGeneration,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

  return {
    contentFrameStyle,
    headerFrameStyle,
    presentationFrameStyle,
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
  };
};
