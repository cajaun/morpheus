import { useLayoutEffect, useRef } from "react";
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

type Params = {
  presentationFullScreen: boolean;
  renderedFullScreenBackgroundScale: number;
  renderedFullScreenSafeAreaTop: boolean;
  safeAreaTopInset: number;
  progress: SharedValue<number>;
  backgroundScale: SharedValue<number>;
  shouldUseLayoutAnimation: boolean;
};

// keep fullscreen background scale safe area and fill state on one clock
export const useFullScreenMorphState = ({
  presentationFullScreen,
  renderedFullScreenBackgroundScale,
  renderedFullScreenSafeAreaTop,
  safeAreaTopInset,
  progress,
  backgroundScale,
  shouldUseLayoutAnimation,
}: Params) => {
  const fullScreenBackgroundScaleTarget = presentationFullScreen
    ? renderedFullScreenBackgroundScale
    : 1;
  const fullScreenBackgroundMorphScale = useSharedValue(
    fullScreenBackgroundScaleTarget,
  );
  const fullScreenSafeAreaTopTarget =
    presentationFullScreen && renderedFullScreenSafeAreaTop
      ? safeAreaTopInset
      : 0;
  const fullScreenSafeAreaTopHeight = useSharedValue(
    fullScreenSafeAreaTopTarget,
  );
  const fullScreenSurfaceFillOpacityTarget = presentationFullScreen ? 1 : 0;
  const fullScreenSurfaceFillOpacity = useSharedValue(
    fullScreenSurfaceFillOpacityTarget,
  );
  const fullScreenLayoutActiveRef = useRef(false);
  const previousPresentationFullScreenRef = useRef(
    presentationFullScreen,
  );
  const fullScreenSafeAreaContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: fullScreenSafeAreaTopHeight.value },
    ],
  }));
  const fullScreenSurfaceFillStyle = useAnimatedStyle(() => ({
    opacity: fullScreenSurfaceFillOpacity.value,
  }));

  useAnimatedReaction(
    () => ({
      morphScale: fullScreenBackgroundMorphScale.value,
      visibility: progress.value,
    }),
    ({ morphScale, visibility }) => {
      // background scale should disappear with the tray during close progress
      backgroundScale.value =
        1 + (morphScale - 1) * visibility;
    },
    [backgroundScale, fullScreenBackgroundMorphScale, progress],
  );

  useLayoutEffect(() => {
    const presentationModeChanged =
      previousPresentationFullScreenRef.current !==
      presentationFullScreen;
    previousPresentationFullScreenRef.current = presentationFullScreen;

    if (presentationModeChanged && shouldUseLayoutAnimation) {
      // layout transition owns these values until native completion arrives
      fullScreenLayoutActiveRef.current = true;
      if (!presentationFullScreen) {
        // leaving fullscreen removes the fill immediately so rounded corners stay visible
        fullScreenSurfaceFillOpacity.value = 0;
      }
      return;
    }

    if (!fullScreenLayoutActiveRef.current) {
      // when no layout animation runs the shared values must snap to current props
      fullScreenSafeAreaTopHeight.value =
        fullScreenSafeAreaTopTarget;
      fullScreenBackgroundMorphScale.value =
        fullScreenBackgroundScaleTarget;
      fullScreenSurfaceFillOpacity.value =
        fullScreenSurfaceFillOpacityTarget;
    }
  }, [
    fullScreenBackgroundMorphScale,
    fullScreenBackgroundScaleTarget,
    fullScreenSafeAreaTopHeight,
    fullScreenSafeAreaTopTarget,
    fullScreenSurfaceFillOpacity,
    fullScreenSurfaceFillOpacityTarget,
    presentationFullScreen,
    shouldUseLayoutAnimation,
  ]);

  return {
    fullScreenBackgroundMorphScale,
    fullScreenBackgroundScaleTarget,
    fullScreenLayoutActiveRef,
    fullScreenSafeAreaContentStyle,
    fullScreenSafeAreaTopHeight,
    fullScreenSafeAreaTopTarget,
    fullScreenSurfaceFillOpacity,
    fullScreenSurfaceFillOpacityTarget,
    fullScreenSurfaceFillStyle,
  };
};
