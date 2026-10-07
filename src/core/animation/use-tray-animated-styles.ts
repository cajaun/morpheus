import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TrayAnimatedStyleParams } from "./tray-animated-style-types";
import { useTrayDragStyle } from "./use-tray-drag-style";
import { useTrayFrameStyles } from "./use-tray-frame-styles";
import { useTrayVisibilityStyles } from "./use-tray-visibility-styles";

// collect shell motion styles so the view tree reads one animation contract
export const useTrayAnimatedStyles = ({
  translateY,
  contentHeight,
  contentHeightSnapshot,
  hasFooter,
  surfaceOpacity,
  footerHeight,
  frameFullScreen,
  preparedSheetFrame,
  transitionGeneration,
  transitionSourceKey,
  transitionTargetKey,
  layoutEnabled,
  originProgress,
  originTargetContentHeight,
  morphProgress,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  fullScreenBoundaryTransition,
  fullScreenBoundarySourceFullScreen,
  fullScreenBoundaryTargetFullScreen,
  transition,
}: TrayAnimatedStyleParams) => {
  const { bottom } = useSafeAreaInsets();
  const shouldUseOriginTransition =
    transition?.open === "expandFromTrigger" &&
    !frameFullScreen &&
    !layoutEnabled;

  const frameStyles = useTrayFrameStyles({
    bottom,
    contentHeight,
    contentHeightSnapshot,
    footerHeight,
    fullScreen: frameFullScreen,
    hasFooter,
    fullScreenBoundaryTransition,
    fullScreenBoundarySourceFullScreen,
    fullScreenBoundaryTargetFullScreen,
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
  });
  const dragStyle = useTrayDragStyle({
    originProgress,
    shouldUseOriginTransition,
    translateY,
  });
  const visibilityStyles = useTrayVisibilityStyles({
    hasFooter,
    originProgress,
    shouldUseOriginTransition,
    surfaceOpacity,
    transition,
  });

  return {
    ...frameStyles,
    dragStyle,
    ...visibilityStyles,
  };
};
