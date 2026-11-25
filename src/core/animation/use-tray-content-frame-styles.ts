import { useAnimatedStyle } from "react-native-reanimated";
import {
  EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS,
  FULL_SCREEN_HEADER_BOTTOM_GAP,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../constants";
import {
  isBoundaryClockStarted,
  isTargetSheetMeasurementPending,
  resolveBoundaryContentStyle,
  resolveBoundaryContentViewportStyle,
  resolveBoundaryHeaderPadding,
  resolveBoundaryProgress,
} from "./frame-style-math";
import {
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT,
  type TrayFrameStyleParams,
} from "./frame-style-params";

// a trigger-origin sheet lays its content out once at the sheet width, the morphing shell is a centered window over it
const ORIGIN_CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;

// content, viewport and header frames across sheet steps and fullscreen boundaries
export const useTrayContentFrameStyles = (
  params: TrayFrameStyleParams,
  {
    hasPreparedSheetFrame,
    preparedSheetHeight,
  }: {
    hasPreparedSheetFrame: boolean;
    preparedSheetHeight: number | undefined;
  },
) => {
  const {
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
    preparedSheetFrame,
    shouldUseOriginTransition,
    surfaceOpacity,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  } = params;

  const contentFrameStyle = useAnimatedStyle(() => {
    const contentRevealOpacity =
      shouldUseOriginTransition &&
      !(originProgress.value > EXPAND_FROM_TRIGGER_CONTENT_REVEAL_PROGRESS)
        ? 0
        : surfaceOpacity.value;

    if (!fullScreenBoundaryTransition) {
      // text never rewraps while the shell narrows or widens, so the measured height holds at every frame of the morph
      const pinsOriginWidth = shouldUseOriginTransition && !fullScreen;

      // a complete neutral sheet frame makes recycled native views release boundary position and width
      return {
        position: "relative",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: pinsOriginWidth ? ORIGIN_CONTENT_WIDTH : "auto",
        height: undefined,
        alignSelf: pinsOriginWidth ? "center" : "stretch",
        flex: fullScreen ? 1 : 0,
        opacity: contentRevealOpacity,
      };
    }

    // the source topology stays bounded until the shell publishes the fullscreen clock
    const boundaryClockStarted = isBoundaryClockStarted(
      transitionGeneration,
      transitionStartedGeneration?.value,
      transitionCompletedGeneration?.value,
    );

    const sourceFullScreen = fullScreenBoundarySourceFullScreen ?? !fullScreen;
    const targetFullScreen = fullScreenBoundaryTargetFullScreen ?? fullScreen;
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
      contentHeight.value > 0 ? contentHeight.value + resolvedFooterHeight : 0;
    const resolvedPreparedSheetHeight =
      hasPreparedSheetFrame && preparedSheetFrame !== undefined
        ? preparedSheetFrame.contentHeight + resolvedFooterHeight
        : preparedSheetHeight;
    const targetSheetMeasurementPending = isTargetSheetMeasurementPending({
      fullScreenBoundaryTransition,
      sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
      targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
      transitionGeneration,
      transitionCompletedGeneration: transitionCompletedGeneration?.value ?? 0,
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
    const sourceFullScreen = fullScreenBoundarySourceFullScreen ?? !fullScreen;
    const targetFullScreen = fullScreenBoundaryTargetFullScreen ?? fullScreen;
    const sourceContentHeight = sourceFullScreen
      ? undefined
      : hasPreparedSheetFrame
        ? preparedSheetFrame?.contentHeight
        : contentHeightSnapshot;
    const targetSheetMeasurementPending = isTargetSheetMeasurementPending({
      fullScreenBoundaryTransition,
      sourceFullScreen: fullScreenBoundarySourceFullScreen === true,
      targetFullScreen: fullScreenBoundaryTargetFullScreen === true,
      transitionGeneration,
      transitionCompletedGeneration: transitionCompletedGeneration?.value ?? 0,
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
      // the fullscreen source keeps its flex viewport until the target sheet commits, then the target measures its intrinsic height without clipping the outgoing content
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

    const sourceFullScreen = fullScreenBoundarySourceFullScreen ?? !fullScreen;
    const targetFullScreen = fullScreenBoundaryTargetFullScreen ?? fullScreen;
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

  return { contentFrameStyle, contentViewportStyle, headerFrameStyle };
};
