import {
  Easing,
  LinearTransition,
  type LayoutAnimationFunction,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { MORPH_ENTERING_DURATION } from "../constants";
import { withFullScreenLayoutStartSignal } from "../full-screen-transition-start";

type TrayLayoutTransitionParams = {
  fullScreenTransitionGeneration: number;
  layoutStartedAt: SharedValue<number>;
  layoutStartedFullScreenGeneration: SharedValue<number>;
  fullScreenSafeAreaTop: SharedValue<number>;
  fullScreenSafeAreaTopTarget: number;
  onConfigure?: (configuredAt: number) => void;
  onStart?: (startedAt: number) => void;
  onComplete?: (finishedAt: number) => void;
};

export const createTrayLayoutTransition = ({
  fullScreenTransitionGeneration,
  layoutStartedAt,
  layoutStartedFullScreenGeneration,
  fullScreenSafeAreaTop,
  fullScreenSafeAreaTopTarget,
  onConfigure,
  onStart,
  onComplete,
}: TrayLayoutTransitionParams) => {
  const transition = LinearTransition
    .duration(MORPH_ENTERING_DURATION)
    .easing(Easing.bezier(0.34, 1.12, 0.64, 1).factory());

  // linearTransition still owns every geometry value
  // its width timing is the canonical clock because width always 
  // changes between sheet and fullscreen
  const buildTransition = transition.build();
  const synchronizedTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    if (onConfigure) {
      runOnJS(onConfigure)(performance.now());
    }

    const animation = buildTransition(values);
    animation.animations.width = withFullScreenLayoutStartSignal(
      animation.animations.width as number,
      layoutStartedFullScreenGeneration,
      layoutStartedAt,
      fullScreenTransitionGeneration,
      onStart,
      {
        value: fullScreenSafeAreaTop,
        target: fullScreenSafeAreaTopTarget,
        layoutTarget: values.targetWidth,
      },
    );

    return {
      ...animation,
      callback: (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)(performance.now());
        }
      },
    };
  };

  return synchronizedTransition;
};
