import { useMemo } from "react";
import { interpolate, useAnimatedStyle } from "react-native-reanimated";
import {
  BORDER_RADIUS,
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HEIGHT,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
} from "../constants";
import { isSheetFrameForTransition } from "../controller/tray-sheet-frame";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_RADIUS,
  EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT,
  type TrayFrameStyleParams as Params,
} from "./frame-style-params";
import { useFrameStylePolicyLog } from "./use-frame-style-policy-log";
import { useTrayContentFrameStyles } from "./use-tray-content-frame-styles";
import { useTrayFooterFrameStyles } from "./use-tray-footer-frame-styles";
import {
  isTargetSheetMeasurementPending,
  resolveBoundaryContentSourceViewportStyle,
  resolveBoundaryProgress,
  resolveBoundaryShellStyle,
} from "./frame-style-math";

// shell frame styles coordinated with measurement and transition ownership
export const useTrayFrameStyles = (params: Params) => {
  const {
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
    transition,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  } = params;
  // footer origin transitions start at the footer edge instead of the screen bottom
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
  useFrameStylePolicyLog(params, hasPreparedSheetFrame);
  // plain geometry styles stay referentially stable so the memoized shell can skip renders
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

  // the fullscreen snapshot sets the source viewport so flex content cannot measure at header height
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
            // the incoming flex tree stays at the source height until the UI boundary frame publishes
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
    // the absolute footer takes no layout space, so the body reserves its measured height
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
    // the shell keeps its rounded corners while fullscreen expands the frame
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
      // trigger expansion interpolates left, width, top, height and radius together
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
      // sheet ownership clears the boundary width so recycled hosts drop fullscreen geometry
      width: "auto",
      // the leased sheet keeps its bottom anchor so nothing snaps before the fullscreen clock starts
      bottom: targetBottom,
      top: fullScreen ? 0 : "auto",
      // regular sheets take their geometry from their children
      height: fullScreen
        ? SCREEN_HEIGHT
        : shouldLeaseBoundarySheetFrame || hasPreparedSheetFrame
          ? boundarySheetFrameHeight
          // measured sheet geometry holds until intrinsic content makes auto valid
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

  const { contentFrameStyle, contentViewportStyle, headerFrameStyle } =
    useTrayContentFrameStyles(params, {
      hasPreparedSheetFrame,
      preparedSheetHeight,
    });

  const { stepFooterContainerStyle, footerContainerStyle } =
    useTrayFooterFrameStyles(params, {
      collapsedBottomInset,
      targetBottomInset,
      originBottomAnchor,
    });

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
    stepFooterContainerStyle,
  };
};
