import {
  Easing,
  LinearTransition,
  type LayoutAnimationFunction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  FULL_SCREEN_LAYOUT_DURATION,
  MORPH_LAYOUT_DURATION,
} from "../constants";
import { withFullScreenLayoutStartSignal } from "../full-screen-transition-start";

type TrayLayoutTransitionParams = {
  fullScreenTransitionGeneration: number;
  layoutStartedAt: SharedValue<number>;
  layoutStartedFullScreenGeneration: SharedValue<number>;
  fullScreenBackgroundScale: SharedValue<number>;
  fullScreenBackgroundScaleTarget: number;
  fullScreenSafeAreaTop: SharedValue<number>;
  fullScreenSafeAreaTopTarget: number;
  fullScreenSurfaceFillOpacity: SharedValue<number>;
  fullScreenSurfaceFillOpacityTarget: number;
  onConfigure?: (configuredAt: number) => void;
  onStart?: (startedAt: number) => void;
  onComplete?: (finishedAt: number) => void;
};

export const createTrayLayoutTransition = ({
  fullScreenTransitionGeneration,
  layoutStartedAt,
  layoutStartedFullScreenGeneration,
  fullScreenBackgroundScale,
  fullScreenBackgroundScaleTarget,
  fullScreenSafeAreaTop,
  fullScreenSafeAreaTopTarget,
  fullScreenSurfaceFillOpacity,
  fullScreenSurfaceFillOpacityTarget,
  onConfigure,
  onStart,
  onComplete,
}: TrayLayoutTransitionParams) => {
  const transition = LinearTransition
    .duration(MORPH_LAYOUT_DURATION)
    .easing(Easing.bezier(0.34, 1.12, 0.64, 1).factory());
  const fullScreenTransition = LinearTransition
    .duration(FULL_SCREEN_LAYOUT_DURATION)
    .easing(Easing.bezier(0, 0, 0.58, 1).factory());

  // linearTransition still owns every geometry value. The vertical origin is
  // the canonical fullscreen clock: the background reaches its target exactly
  // when the tray reaches the top edge, rather than tracking the much shorter
  // horizontal expansion.
  const buildTransition = transition.build();
  const buildFullScreenTransition = fullScreenTransition.build();
  const synchronizedTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    if (onConfigure) {
      scheduleOnRN(onConfigure, performance.now());
    }

    const isFullScreenTransition =
      layoutStartedFullScreenGeneration.value <
      fullScreenTransitionGeneration;
    if (
      isFullScreenTransition &&
      fullScreenSurfaceFillOpacityTarget === 0
    ) {
      fullScreenSurfaceFillOpacity.value = 0;
    }
    const animation = isFullScreenTransition
      ? buildFullScreenTransition(values)
      : buildTransition(values);
    animation.animations.originY = withFullScreenLayoutStartSignal(
      animation.animations.originY as number,
      layoutStartedFullScreenGeneration,
      layoutStartedAt,
      fullScreenTransitionGeneration,
      onStart,
      [
        {
          value: fullScreenSafeAreaTop,
          target: fullScreenSafeAreaTopTarget,
          layoutTarget: values.targetOriginY,
        },
        {
          value: fullScreenBackgroundScale,
          target: fullScreenBackgroundScaleTarget,
          layoutTarget: values.targetOriginY,
        },
      ],
    );

    return {
      ...animation,
      callback: (finished) => {
        if (finished) {
          // The fill exists to cover the viewport only after the rounded shell
          // has completed its expansion. It is deliberately a hard handoff,
          // not another visual animation.
          fullScreenSurfaceFillOpacity.value =
            fullScreenSurfaceFillOpacityTarget;
        }
        if (finished && onComplete) {
          scheduleOnRN(onComplete, performance.now());
        }
      },
    };
  };

  return synchronizedTransition;
};
