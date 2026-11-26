import { useMemo } from "react";
import type { useTrayPresentationState } from "./use-tray-presentation-state";
import type { useTrayRenderState } from "./use-tray-render-state";
import type { useTransitionClockValues } from "./use-transition-clock-values";
import type { TraySheetFrame } from "../types/tray";

// one stable object of every shared value the visual surface reads
export const useControllerSharedValues = (
  presentationShared: ReturnType<typeof useTrayPresentationState>["shared"],
  {
    morphProgress,
    transitionGenerationValue,
    fullScreenChangedValue,
    transitionStartedAt,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  }: ReturnType<typeof useTransitionClockValues>,
) => {
  return useMemo(
    () => ({
      translateY: presentationShared.translateY,
      contentHeight: presentationShared.contentHeight,
      footerHeight: presentationShared.footerHeight,
      active: presentationShared.active,
      context: presentationShared.context,
      hasFooter: presentationShared.hasFooter,
      surfaceOpacity: presentationShared.surfaceOpacity,
      totalHeight: presentationShared.totalHeight,
      progress: presentationShared.progress,
      originProgress: presentationShared.originProgress,
      morphProgress,
      transitionGenerationValue,
      fullScreenChangedValue,
      transitionStartedAt,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
      originTargetContentHeight: presentationShared.originTargetContentHeight,
    }),
    [
      presentationShared.active,
      presentationShared.contentHeight,
      presentationShared.context,
      presentationShared.footerHeight,
      presentationShared.hasFooter,
      presentationShared.originProgress,
      presentationShared.originTargetContentHeight,
      presentationShared.progress,
      presentationShared.surfaceOpacity,
      presentationShared.totalHeight,
      presentationShared.translateY,
      morphProgress,
      transitionCompletedGeneration,
      transitionGenerationValue,
      transitionLayoutStartedGeneration,
      transitionStartedAt,
      transitionStartedGeneration,
      fullScreenChangedValue,
    ],
  );
};

// the committed render state the visual surface draws from
export const useControllerVisualState = ({
  renderedState,
  layoutEnabled,
  contentHeightSnapshot,
  preparedSheetFrame,
  isSurfaceReady,
  frameFullScreen,
}: {
  renderedState: ReturnType<typeof useTrayRenderState>["state"];
  layoutEnabled: boolean;
  contentHeightSnapshot: number;
  preparedSheetFrame: TraySheetFrame | undefined;
  isSurfaceReady: boolean;
  frameFullScreen: boolean;
}) =>
  useMemo(
    () => ({
      layoutEnabled: layoutEnabled,
      contentHeightSnapshot,
      preparedSheetFrame: preparedSheetFrame,
      isSurfaceReady: isSurfaceReady,
      renderedFooter: renderedState.renderedFooter,
      renderedHeader: renderedState.renderedHeader,
      renderedContent: renderedState.renderedContent,
      renderedTrayId: renderedState.renderedTrayId,
      renderedFullScreen: renderedState.renderedFullScreen,
      renderedFullScreenBackgroundScale:
        renderedState.renderedFullScreenBackgroundScale,
      frameFullScreen,
      renderedFullScreenDraggable: renderedState.renderedFullScreenDraggable,
      renderedFullScreenSafeAreaTop:
        renderedState.renderedFullScreenSafeAreaTop,
      renderedContainerStyle: renderedState.renderedContainerStyle,
      renderedClassName: renderedState.renderedClassName,
      renderedFooterStyle: renderedState.renderedFooterStyle,
    }),
    [
      contentHeightSnapshot,
      frameFullScreen,
      preparedSheetFrame,
      layoutEnabled,
      isSurfaceReady,
      renderedState.renderedClassName,
      renderedState.renderedContainerStyle,
      renderedState.renderedContent,
      renderedState.renderedFooter,
      renderedState.renderedFooterStyle,
      renderedState.renderedFullScreen,
      renderedState.renderedFullScreenBackgroundScale,
      renderedState.renderedFullScreenDraggable,
      renderedState.renderedFullScreenSafeAreaTop,
      renderedState.renderedHeader,
      renderedState.renderedTrayId,
    ],
  );
