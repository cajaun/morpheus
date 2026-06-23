import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ActionTrayAnimatedStyleParams } from "./action-tray-animated-style-types";
import { useActionTrayDragStyle } from "./use-action-tray-drag-style";
import { useActionTrayFrameStyles } from "./use-action-tray-frame-styles";
import { useActionTrayVisibilityStyles } from "./use-action-tray-visibility-styles";

// collect shell motion styles so the view tree reads one animation contract
export const useActionTrayAnimatedStyles = ({
  translateY,
  contentHeight,
  hasFooter,
  surfaceOpacity,
  footerHeight,
  keyboardHeight,
  frameFullScreen,
  preparedSheetFrameHeight,
  useMeasuredSheetHeight,
  layoutEnabled,
  originProgress,
  transition,
}: ActionTrayAnimatedStyleParams) => {
  const { bottom } = useSafeAreaInsets();
  const shouldUseOriginTransition =
    transition?.open === "expandFromTrigger" &&
    !frameFullScreen &&
    !layoutEnabled;

  const frameStyles = useActionTrayFrameStyles({
    bottom,
    contentHeight,
    footerHeight,
    fullScreen: frameFullScreen,
    hasFooter,
    keyboardHeight,
    originProgress,
    preparedSheetFrameHeight,
    shouldUseOriginTransition,
    transition,
    useMeasuredSheetHeight,
  });
  const dragStyle = useActionTrayDragStyle({
    originProgress,
    shouldUseOriginTransition,
    translateY,
  });
  const visibilityStyles = useActionTrayVisibilityStyles({
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
