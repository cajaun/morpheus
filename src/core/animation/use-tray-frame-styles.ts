import { useEffect, useMemo } from "react";
import {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_FOOTER_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
  FULL_SCREEN_HEADER_BOTTOM_GAP,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "../constants";
import type {
  TrayAnimatedStyleParams,
  TrayAnimationState,
} from "./tray-animated-style-types";
import { isSheetFrameForTransition } from "../controller/tray-sheet-frame";
import { isTrayDebugLoggingEnabled, log, logWorklet } from "../logger";
import {
  isBoundaryClockStarted,
  isTargetSheetMeasurementPending,
  resolveBoundaryContentStyle,
  resolveBoundaryContentSourceViewportStyle,
  resolveBoundaryContentViewportStyle,
  resolveBoundaryHeaderPadding,
  resolveBoundaryProgress,
  resolveBoundaryShellStyle,
} from "./frame-style-math";

const EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT / 2;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING =
  TRAY_FOOTER_PADDING_TOP;

const EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT =
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT +
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_TOP_PADDING +
  TRAY_FOOTER_PADDING_BOTTOM;

type Params = Pick<
  TrayAnimatedStyleParams,
  | "contentHeight"
  | "footerHeight"
  | "fullScreenBoundaryTransition"
  | "fullScreenBoundarySourceFullScreen"
  | "fullScreenBoundaryTargetFullScreen"
  | "hasFooter"
  | "transitionStartedGeneration"
  | "transitionLayoutStartedGeneration"
  | "transitionCompletedGeneration"
  | "transition"
  | "surfaceOpacity"
> &
  TrayAnimationState;

// coordinate shell frame styles with measurement and transition ownership
export const useTrayFrameStyles = ({
  bottom,
  contentHeight,
  contentHeightSnapshot,
  footerHeight,
  fullScreenBoundaryTransition,
  fullScreenBoundarySourceFullScreen,
  fullScreenBoundaryTargetFullScreen,
  fullScreen,
  hasFooter,
  morphProgress,
  originProgress,
  originTargetContentHeight,
  preparedSheetFrame,
  shouldUseOriginTransition,
  surfaceOpacity,
  transition,
  transitionGeneration,
  transitionSourceKey,
  transitionTargetKey,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
}: Params) => {
  // footer origin transitions begin at the footer edge instead of screen bottom
  const collapsedBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_FOOTER_PADDING_BOTTOM
      : EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter" ? collapsedBottomInset : 0;
  const originBottomAnchor =
    transition?.origin === "fullScreenFooter" ? HORIZONTAL_MARGIN : bottom;
  const hasPreparedSheetFrame = isSheetFrameForTransition(
    preparedSheetFrame,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
  );
  const preparedSheetHeight = preparedSheetFrame?.totalHeight;
  const preparedFrameGeneration = preparedSheetFrame?.generation ?? 0;
  const preparedFrameHeight = preparedSheetFrame?.totalHeight ?? 0;
  const targetSheetMeasurementCandidate =
    fullScreenBoundaryTransition &&
    transitionGeneration !== undefined &&
    transitionGeneration > 0 &&
    fullScreenBoundarySourceFullScreen === true &&
    fullScreenBoundaryTargetFullScreen === false &&
    !hasPreparedSheetFrame;

  useEffect(() => {
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("FRAME STYLE POLICY", {
      fullScreen,
      fullScreenBoundaryTransition,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      transitionGeneration,
      transitionSourceKey,
      transitionTargetKey,
      hasPreparedSheetFrame,
      preparedFrameGeneration,
      preparedFrameHeight,
      targetSheetMeasurementCandidate,
      morphProgress: morphProgress.value,
      transitionStartedGeneration: transitionStartedGeneration?.value,
      transitionLayoutStartedGeneration:
        transitionLayoutStartedGeneration?.value,
      transitionCompletedGeneration: transitionCompletedGeneration?.value,
    });
  }, [
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    hasPreparedSheetFrame,
    morphProgress,
    preparedFrameGeneration,
    preparedFrameHeight,
    transitionCompletedGeneration,
    transitionGeneration,
    transitionLayoutStartedGeneration,
    transitionSourceKey,
    transitionStartedGeneration,
    transitionTargetKey,
    targetSheetMeasurementCandidate,
  ]);

  useAnimatedReaction(
    () => ({
      fullScreen: fullScreen ? 1 : 0,
      boundary: fullScreenBoundaryTransition ? 1 : 0,
      transitionGeneration: transitionGeneration ?? 0,
      hasPreparedSheetFrame: hasPreparedSheetFrame ? 1 : 0,
      preparedFrameGeneration,
      preparedFrameHeight,
      targetSheetMeasurementPending: isTargetSheetMeasurementPending({
        fullScreenBoundaryTransition,
        sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
        targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
        transitionGeneration,
        transitionCompletedGeneration:
          transitionCompletedGeneration?.value ?? 0,
        hasPreparedSheetFrame,
      })
        ? 1
        : 0,
      transitionStartedGeneration:
        transitionStartedGeneration?.value ?? 0,
      transitionLayoutStartedGeneration:
        transitionLayoutStartedGeneration?.value ?? 0,
      transitionCompletedGeneration:
        transitionCompletedGeneration?.value ?? 0,
    }),
    (state, previous) => {
      if (
        previous &&
        state.fullScreen === previous.fullScreen &&
        state.boundary === previous.boundary &&
        state.transitionGeneration === previous.transitionGeneration &&
        state.hasPreparedSheetFrame === previous.hasPreparedSheetFrame &&
        state.preparedFrameGeneration === previous.preparedFrameGeneration &&
        state.preparedFrameHeight === previous.preparedFrameHeight &&
        state.targetSheetMeasurementPending ===
          previous.targetSheetMeasurementPending &&
        state.transitionStartedGeneration ===
          previous.transitionStartedGeneration &&
        state.transitionLayoutStartedGeneration ===
          previous.transitionLayoutStartedGeneration &&
        state.transitionCompletedGeneration ===
          previous.transitionCompletedGeneration
      ) {
        return;
      }

      logWorklet("FRAME STYLE UI STATE", state);
    },
    [
      fullScreen,
      fullScreenBoundaryTransition,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      hasPreparedSheetFrame,
      preparedFrameGeneration,
      preparedFrameHeight,
      transitionCompletedGeneration,
      transitionGeneration,
      transitionLayoutStartedGeneration,
      transitionStartedGeneration,
    ],
  );
  // let boundary layout own the shell frame while the absolute footer follows it
  // Keep plain geometry styles referentially stable so the memoized shell can
  // skip renders when the geometry inputs have not changed.
  const presentationFrameStyle = useMemo(
    () =>
      !fullScreenBoundaryTransition && fullScreen
        ? {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            height: SCREEN_HEIGHT,
          }
        : !fullScreenBoundaryTransition && hasPreparedSheetFrame
          ? {
              left: HORIZONTAL_MARGIN,
              right: HORIZONTAL_MARGIN,
              top: "auto" as const,
              bottom: HORIZONTAL_MARGIN + targetBottomInset,
              height: preparedSheetHeight,
            }
          : undefined,
    [
      fullScreen,
      fullScreenBoundaryTransition,
      hasPreparedSheetFrame,
      preparedSheetHeight,
      targetBottomInset,
    ],
  );

  // establish the source viewport with the fullscreen snapshot so flex content cannot measure at header height
  const contentBoundarySourceStyle = useMemo(
    () =>
      fullScreenBoundaryTransition &&
      !(fullScreenBoundaryTargetFullScreen === false && !fullScreen)
        ? {
            position: "absolute" as const,
            top: 0,
            bottom: 0,
            left: 0,
            width:
              (fullScreenBoundarySourceFullScreen ?? !fullScreen)
                ? SCREEN_WIDTH
                : SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
            // bound the incoming flex tree to the source height until the ui boundary frame publishes
            height:
              (fullScreenBoundarySourceFullScreen ?? !fullScreen)
                ? SCREEN_HEIGHT
                : hasPreparedSheetFrame
                  ? preparedSheetHeight
                  : undefined,
            alignSelf: "flex-start" as const,
          }
        : undefined,
    [
      fullScreen,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      fullScreenBoundaryTransition,
      hasPreparedSheetFrame,
      preparedSheetHeight,
    ],
  );

  const sourceFullScreen =
    fullScreenBoundarySourceFullScreen ?? !fullScreen;
  const sourceContentHeight =
    sourceFullScreen
      ? undefined
      : hasPreparedSheetFrame
        ? preparedSheetFrame?.contentHeight
        : contentHeightSnapshot;
  const resolvedSourceContentHeight =
    sourceContentHeight !== undefined && sourceContentHeight > 0
      ? sourceContentHeight
      : undefined;
  const contentBoundarySourceViewportStyle = useMemo(
    () =>
      resolveBoundaryContentSourceViewportStyle({
        fullScreenBoundaryTransition,
        sourceFullScreen,
        sourceContentHeight: resolvedSourceContentHeight,
      }),
    [
      fullScreenBoundaryTransition,
      resolvedSourceContentHeight,
      sourceFullScreen,
    ],
  );

  const footerSpacerStyle = useAnimatedStyle(() => ({
    // the absolute footer does not participate in layout so the body still reserves its measured space when the shell derives its sheet height
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
    const stableOriginContentHeight =
      shouldUseOriginTransition && originTargetContentHeight.value > 0
        ? originTargetContentHeight.value
        : contentHeight.value;
    const resolvedSheetHeight =
      stableOriginContentHeight > 0
        ? Math.max(0, stableOriginContentHeight + resolvedFooterHeight)
        : undefined;
    const resolvedPreparedSheetHeight =
      hasPreparedSheetFrame && preparedSheetFrame !== undefined
        ? preparedSheetFrame.contentHeight + resolvedFooterHeight
        : preparedSheetHeight;
    const targetSheetMeasurementPending = isTargetSheetMeasurementPending({
      fullScreenBoundaryTransition,
      sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
      targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
      transitionGeneration,
      transitionCompletedGeneration:
        transitionCompletedGeneration?.value ?? 0,
      hasPreparedSheetFrame,
    });
    const boundarySheetFrameHeight =
      fullScreenBoundaryTransition &&
      !fullScreen &&
      hasPreparedSheetFrame
        ? resolvedPreparedSheetHeight
        : targetSheetMeasurementPending
          ? SCREEN_HEIGHT
          : resolvedSheetHeight;
    const targetLeft = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetRight = fullScreen ? 0 : HORIZONTAL_MARGIN;
    const targetBottom = fullScreen
      ? 0
      : shouldUseOriginTransition
        ? originBottomAnchor + targetBottomInset
        : HORIZONTAL_MARGIN + targetBottomInset;
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
      const sourceHeight = sourceFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? resolvedPreparedSheetHeight ?? 0
          : resolvedSheetHeight ?? 0;
      const targetHeight = targetFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? resolvedPreparedSheetHeight ?? 0
          : targetSheetMeasurementPending
            ? SCREEN_HEIGHT
            : resolvedSheetHeight ?? 0;
      const progress = resolveBoundaryProgress(
        morphProgress.value,
        transitionGeneration,
        transitionStartedGeneration?.value,
        transitionLayoutStartedGeneration?.value,
        transitionCompletedGeneration?.value,
        fullScreenBoundaryTransition,
      );

      return resolveBoundaryShellStyle({
        progress,
        sourceFullScreen,
        targetFullScreen,
        sourceHeight,
        targetHeight,
        bottomInset: targetBottomInset,
      });
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
        (originBottomAnchor + collapsedBottomInset) -
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
      // clear boundary width when sheet ownership returns so recycled hosts cannot retain fullscreen geometry
      width: "auto",
      // keep the leased sheet bottom anchored to avoid a bottom to top snap before the fullscreen clock starts
      bottom: targetBottom,
      top: fullScreen ? 0 : "auto",
      // let regular sheets derive geometry from children
      height: fullScreen
        ? SCREEN_HEIGHT
        : shouldLeaseBoundarySheetFrame || hasPreparedSheetFrame
          ? boundarySheetFrameHeight
          // preserve measured sheet geometry until intrinsic content makes auto valid
          : resolvedSheetHeight ?? "auto",
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
    originBottomAnchor,
    originTargetContentHeight,
    preparedSheetFrame,
    shouldUseOriginTransition,
    targetBottomInset,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

  const contentFrameStyle = useAnimatedStyle(() => {
    const contentRevealOpacity =
      shouldUseOriginTransition &&
      !(originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS)
        ? 0
        : surfaceOpacity.value;

    if (!fullScreenBoundaryTransition) {
      // return a complete neutral sheet frame so recycled native views release boundary position and width
      return {
        position: "relative",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: "auto",
        height: undefined,
        alignSelf: "stretch",
        flex: fullScreen ? 1 : 0,
        opacity: contentRevealOpacity,
      };
    }

    // bound the source topology until the shell participant publishes the fullscreen clock
    const boundaryClockStarted = isBoundaryClockStarted(
      transitionGeneration,
      transitionStartedGeneration?.value,
      transitionCompletedGeneration?.value,
    );

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
    const resolvedFooterHeight = hasFooter.value
      ? shouldUseOriginTransition
        ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
        : footerHeight.value
      : 0;
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? contentHeight.value + resolvedFooterHeight
        : 0;
    const resolvedPreparedSheetHeight =
      hasPreparedSheetFrame && preparedSheetFrame !== undefined
        ? preparedSheetFrame.contentHeight + resolvedFooterHeight
        : preparedSheetHeight;
    const targetSheetMeasurementPending = isTargetSheetMeasurementPending({
      fullScreenBoundaryTransition,
      sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
      targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
      transitionGeneration,
      transitionCompletedGeneration:
        transitionCompletedGeneration?.value ?? 0,
      hasPreparedSheetFrame,
    });
    const sourceHeight = sourceFullScreen
      ? SCREEN_HEIGHT
      : hasPreparedSheetFrame
        ? resolvedPreparedSheetHeight
        : resolvedSheetHeight;
    const targetHeight = targetFullScreen
      ? SCREEN_HEIGHT
      : hasPreparedSheetFrame
        ? resolvedPreparedSheetHeight
        : targetSheetMeasurementPending
          ? SCREEN_HEIGHT
          : resolvedSheetHeight;
    return {
      ...resolveBoundaryContentStyle({
        progress,
        boundaryClockStarted,
        sourceFullScreen,
        targetFullScreen,
        sourceHeight: sourceHeight ?? 0,
        targetHeight: targetHeight ?? 0,
        measurementPending: targetSheetMeasurementPending && !fullScreen,
      }),
      opacity: contentRevealOpacity,
    };
  }, [
    contentHeight,
    footerHeight,
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    hasFooter,
    morphProgress,
    originProgress,
    preparedSheetFrame,
    shouldUseOriginTransition,
    surfaceOpacity,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionCompletedGeneration,
  ]);

  const contentViewportStyle = useAnimatedStyle(() => {
    const boundaryClockStarted = isBoundaryClockStarted(
      transitionGeneration,
      transitionStartedGeneration?.value,
      transitionCompletedGeneration?.value,
    );
    const sourceFullScreen =
      fullScreenBoundarySourceFullScreen ?? !fullScreen;
    const targetFullScreen =
      fullScreenBoundaryTargetFullScreen ?? fullScreen;
    const sourceContentHeight =
      sourceFullScreen
        ? undefined
        : hasPreparedSheetFrame
          ? preparedSheetFrame?.contentHeight
          : contentHeightSnapshot;
    const targetSheetMeasurementPending = isTargetSheetMeasurementPending({
      fullScreenBoundaryTransition,
      sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
      targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
      transitionGeneration,
      transitionCompletedGeneration:
        transitionCompletedGeneration?.value ?? 0,
      hasPreparedSheetFrame,
    });

    return resolveBoundaryContentViewportStyle({
      boundaryClockStarted,
      fullScreenBoundaryTransition,
      sourceFullScreen,
      targetFullScreen,
      sourceContentHeight:
        sourceContentHeight !== undefined && sourceContentHeight > 0
          ? sourceContentHeight
          : undefined,
      // The source fullscreen snapshot must keep its flex viewport until the
      // target sheet snapshot has committed. Once the rendered mode is sheet,
      // the same pending state can switch the target content to intrinsic
      // measurement without clipping the outgoing fullscreen content.
      targetSheetMeasurementPending:
        targetSheetMeasurementPending && !fullScreen,
    });
  }, [
    contentHeightSnapshot,
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    hasFooter,
    hasPreparedSheetFrame,
    preparedSheetHeight,
    preparedSheetFrame,
    shouldUseOriginTransition,
    transitionCompletedGeneration,
    transitionGeneration,
    transitionStartedGeneration,
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
      paddingBottom: resolveBoundaryHeaderPadding({
        progress,
        sourceFullScreen,
        targetFullScreen,
        fullScreenHeaderBottomGap: FULL_SCREEN_HEADER_BOTTOM_GAP,
      }),
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
    const resolvedFooterBottom = shouldUseOriginTransition
      ? originBottomAnchor + targetBottomInset
      : HORIZONTAL_MARGIN + targetBottomInset;
    const targetRadius = BORDER_RADIUS;
    const footerOpacity = hasFooter.value ? surfaceOpacity.value : 0;

    if (shouldUseOriginTransition) {
      // origin expansion is the footer s own presentation transition regular step changes never enter this branch
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
        (originBottomAnchor + collapsedBottomInset) -
        EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT;

      return {
        opacity: footerOpacity,
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
      // keep the detached footer on the same bottom anchor throughout the boundary transition
      const sourceBottom = resolvedFooterBottom;
      const targetBoundaryBottom = resolvedFooterBottom;

      return {
        opacity: footerOpacity,
        // the footer is detached from ordinary content layout but follows the same explicit shell clock when the presentation mode changes
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
      opacity: footerOpacity,
      // fixed footers stay at the same screen position during ordinary step changes even when the content shell changes height
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

  return {
    contentBoundarySourceStyle,
    contentBoundarySourceViewportStyle,
    contentFrameStyle,
    contentViewportStyle,
    headerFrameStyle,
    presentationFrameStyle,
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
  };
};
