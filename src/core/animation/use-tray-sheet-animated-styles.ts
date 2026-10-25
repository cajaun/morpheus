import { useMemo } from "react";
import { useAnimatedStyle } from "react-native-reanimated";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "../constants";
import { isSheetFrameForTransition } from "../controller/tray-sheet-frame";
import type { TrayAnimatedStyleParams } from "./tray-animated-style-types";
import type { TrayAnimatedStyles } from "./use-tray-animated-styles";

const SHEET_CONTENT_FRAME_STYLE = {
  position: "relative" as const,
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: "auto" as const,
  height: undefined,
  alignSelf: "stretch" as const,
  flex: 0,
};

const SHEET_CONTENT_VIEWPORT_STYLE = {};
const SHEET_HEADER_FRAME_STYLE = { paddingBottom: 0 };
const ZERO_CONTENT_PADDING_STYLE = {
  paddingHorizontal: 0,
  paddingBottom: 0,
  paddingTop: 0,
};
const EMPTY_STYLE = {};

const SHEET_FOOTER_CONTENT_FRAME_STYLE = {
  alignSelf: "center" as const,
  width:
    SCREEN_WIDTH -
    HORIZONTAL_MARGIN * 2 -
    TRAY_SHEET_BODY_HORIZONTAL_PADDING * 2,
};

const SHEET_FOOTER_CONTAINER_STYLE = {
  left: HORIZONTAL_MARGIN,
  right: HORIZONTAL_MARGIN,
  bottom: HORIZONTAL_MARGIN,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: BORDER_RADIUS,
  borderBottomRightRadius: BORDER_RADIUS,
};

const FULL_SCREEN_FOOTER_ORIGIN_CONTAINER_STYLE = {
  ...SHEET_FOOTER_CONTAINER_STYLE,
  bottom: HORIZONTAL_MARGIN + TRAY_FOOTER_PADDING_BOTTOM,
};

// A tray with no fullscreen-capable step cannot enter the boundary transition
// system. Keep its sheet geometry and interaction styles, without registering
// the fullscreen boundary worklets used by the general animation hook.
export const useTraySheetAnimatedStyles = ({
  translateY,
  contentHeight,
  hasFooter,
  footerHeight,
  surfaceOpacity,
  preparedSheetFrame,
  transitionGeneration,
  transitionSourceKey,
  transitionTargetKey,
  transition,
}: TrayAnimatedStyleParams): TrayAnimatedStyles => {
  const hasPreparedSheetFrame = isSheetFrameForTransition(
    preparedSheetFrame,
    transitionGeneration,
    transitionSourceKey,
    transitionTargetKey,
  );
  const preparedSheetHeight = preparedSheetFrame?.totalHeight;
  const targetBottomInset =
    transition?.origin === "fullScreenFooter"
      ? TRAY_FOOTER_PADDING_BOTTOM
      : 0;
  const presentationFrameStyle = useMemo(
    () =>
      hasPreparedSheetFrame && preparedSheetHeight !== undefined
        ? {
            left: HORIZONTAL_MARGIN,
            right: HORIZONTAL_MARGIN,
            top: "auto" as const,
            bottom: HORIZONTAL_MARGIN + targetBottomInset,
            height: preparedSheetHeight,
          }
        : undefined,
    [hasPreparedSheetFrame, preparedSheetHeight, targetBottomInset],
  );

  const footerSpacerStyle = useAnimatedStyle(
    () => ({
      height: hasFooter.value ? footerHeight.value : 0,
    }),
    [footerHeight, hasFooter],
  );
  const trayLayoutStyle = useAnimatedStyle(
    () => {
      const resolvedFooterHeight = hasFooter.value ? footerHeight.value : 0;
      const resolvedSheetHeight =
        contentHeight.value > 0
          ? Math.max(0, contentHeight.value + resolvedFooterHeight)
          : undefined;
      const resolvedPreparedSheetHeight =
        hasPreparedSheetFrame && preparedSheetFrame !== undefined
          ? preparedSheetFrame.contentHeight + resolvedFooterHeight
          : preparedSheetHeight;

      return {
        left: HORIZONTAL_MARGIN,
        right: HORIZONTAL_MARGIN,
        width: "auto",
        bottom: HORIZONTAL_MARGIN + targetBottomInset,
        top: "auto",
        height: hasPreparedSheetFrame
          ? resolvedPreparedSheetHeight
          : resolvedSheetHeight ?? "auto",
        borderRadius: BORDER_RADIUS,
      };
    },
    [
      contentHeight,
      footerHeight,
      hasFooter,
      hasPreparedSheetFrame,
      preparedSheetFrame,
      preparedSheetHeight,
      targetBottomInset,
    ],
  );
  const dragStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: translateY.value }],
    }),
    [translateY],
  );
  const surfaceVisibilityStyle = useAnimatedStyle(
    () => ({ opacity: surfaceOpacity.value }),
    [surfaceOpacity],
  );
  const contentRevealStyle = useAnimatedStyle(
    () => ({ opacity: surfaceOpacity.value }),
    [surfaceOpacity],
  );
  const footerVisibilityStyle = useAnimatedStyle(
    () => ({
      opacity: hasFooter.value ? surfaceOpacity.value : 0,
    }),
    [hasFooter, surfaceOpacity],
  );

  return {
    contentBoundarySourceStyle: undefined,
    contentBoundarySourceViewportStyle: undefined,
    contentFrameStyle: SHEET_CONTENT_FRAME_STYLE,
    contentViewportStyle: SHEET_CONTENT_VIEWPORT_STYLE,
    headerFrameStyle: SHEET_HEADER_FRAME_STYLE,
    presentationFrameStyle,
    footerSpacerStyle,
    trayLayoutStyle,
    footerContainerStyle:
      transition?.origin === "fullScreenFooter"
        ? FULL_SCREEN_FOOTER_ORIGIN_CONTAINER_STYLE
        : SHEET_FOOTER_CONTAINER_STYLE,
    contentPaddingStyle: ZERO_CONTENT_PADDING_STYLE,
    dragStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle: EMPTY_STYLE,
    contentRevealStyle,
    footerVisibilityStyle,
    footerContentFrameStyle: SHEET_FOOTER_CONTENT_FRAME_STYLE,
  } as unknown as TrayAnimatedStyles;
};
