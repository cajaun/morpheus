import { useEffect } from "react";
import {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
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
import { isSheetFrameForTransition } from "../controller/action-tray-sheet-frame";
import { log } from "../logger";
import {
  isBoundaryClockStarted,
  resolveBoundaryContentStyle,
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
  preparedSheetFrame,
  shouldUseOriginTransition,
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
  const hasPreparedSheetFrame = isSheetFrameForTransition(
    preparedSheetFrame,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
  );
  const preparedSheetHeight = preparedSheetFrame?.totalHeight;
  const preparedFrameGeneration = preparedSheetFrame?.generation ?? 0;
  const preparedFrameHeight = preparedSheetFrame?.totalHeight ?? 0;

  useEffect(() => {
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
  ]);

  useAnimatedReaction(
    () => ({
      fullScreen: fullScreen ? 1 : 0,
      boundary: fullScreenBoundaryTransition ? 1 : 0,
      transitionGeneration: transitionGeneration ?? 0,
      hasPreparedSheetFrame: hasPreparedSheetFrame ? 1 : 0,
      preparedFrameGeneration,
      preparedFrameHeight,
      morphProgress: morphProgress.value,
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
        state.transitionStartedGeneration ===
          previous.transitionStartedGeneration &&
        state.transitionLayoutStartedGeneration ===
          previous.transitionLayoutStartedGeneration &&
        state.transitionCompletedGeneration ===
          previous.transitionCompletedGeneration
      ) {
        return;
      }

      scheduleOnRN(log, "FRAME STYLE UI STATE", state);
    },
    [
      fullScreen,
      fullScreenBoundaryTransition,
      hasPreparedSheetFrame,
      morphProgress,
      preparedFrameGeneration,
      preparedFrameHeight,
      transitionCompletedGeneration,
      transitionGeneration,
      transitionLayoutStartedGeneration,
      transitionStartedGeneration,
    ],
  );
  // let boundary layout own the shell frame while the absolute footer follows it
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
        hasPreparedSheetFrame
      ? {
          left: HORIZONTAL_MARGIN,
          right: HORIZONTAL_MARGIN,
          top: "auto" as const,
          bottom: bottom + targetBottomInset,
          height: preparedSheetHeight,
        }
      : undefined;

  // establish the source viewport with the fullscreen snapshot so flex content cannot measure at header height
  const contentBoundarySourceStyle = fullScreenBoundaryTransition
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
    : undefined;

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
    const resolvedSheetHeight =
      contentHeight.value > 0
        ? Math.max(0, contentHeight.value + resolvedFooterHeight)
        : undefined;
    const boundarySheetFrameHeight =
      fullScreenBoundaryTransition &&
      !fullScreen &&
      hasPreparedSheetFrame
        ? preparedSheetHeight
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
      const sourceHeight = sourceFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? preparedSheetHeight ?? 0
          : resolvedSheetHeight ?? 0;
      const targetHeight = targetFullScreen
        ? SCREEN_HEIGHT
        : hasPreparedSheetFrame
          ? preparedSheetHeight ?? 0
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
        bottom,
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
    const sourceHeight = sourceFullScreen
      ? SCREEN_HEIGHT
      : hasPreparedSheetFrame
        ? preparedSheetHeight
        : resolvedSheetHeight;
    const targetHeight = targetFullScreen
      ? SCREEN_HEIGHT
      : hasPreparedSheetFrame
        ? preparedSheetHeight
        : resolvedSheetHeight;
    return resolveBoundaryContentStyle({
      progress,
      boundaryClockStarted,
      sourceFullScreen,
      targetFullScreen,
      sourceHeight: sourceHeight ?? 0,
      targetHeight: targetHeight ?? 0,
    });
  }, [
    contentHeight,
    footerHeight,
    fullScreen,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
    fullScreenBoundaryTransition,
    hasFooter,
    morphProgress,
    preparedSheetFrame,
    shouldUseOriginTransition,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
    transitionStartedGeneration,
    transitionCompletedGeneration,
  ]);

  const contentViewportStyle = useAnimatedStyle(() => {
    if (!fullScreen || !fullScreenBoundaryTransition) {
      return {};
    }

    // keep the inner fullscreen root filling the bounded content frame throughout the handoff
    return {
      flex: 1,
    };
  }, [
    fullScreen,
    fullScreenBoundaryTransition,
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
    const resolvedFooterBottom =
      !shouldUseOriginTransition && keyboardHeight.value > 0
        ? keyboardHeight.value
        : bottom + targetBottomInset;
    const targetRadius = BORDER_RADIUS;

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
      // anchor the detached footer to safe area bottom so its fullscreen and sheet frames share an edge
      const sourceBottom = resolvedFooterBottom;
      const targetBoundaryBottom = resolvedFooterBottom;

      return {
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
    contentBoundarySourceStyle,
    contentFrameStyle,
    contentViewportStyle,
    headerFrameStyle,
    presentationFrameStyle,
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle,
  };
};
