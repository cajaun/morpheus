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
import { withTrayTransitionStart } from "../transition-start";
import { withTrayLayoutProgress } from "./with-tray-layout-progress";

type TrayLayoutTransitionParams = {
  transitionGeneration: number;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  fullScreenBoundaryTransition: boolean;
  morphProgress: SharedValue<number>;
  onConfigure?: (configuredAt: number) => void;
  onStart?: (startedAt: number) => void;
  onComplete?: (finishedAt: number) => void;
};

export const createTrayLayoutTransition = ({
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  fullScreenBoundaryTransition,
  morphProgress,
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

  const buildTransition = transition.build();
  const buildFullScreenTransition = fullScreenTransition.build();
  const synchronizedTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    if (onConfigure) {
      // configuration fires before native animation start so timing can split setup from motion
      scheduleOnRN(onConfigure, performance.now());
    }

    // The boundary policy is consumed once per generic transition generation.
    // After completion, later layout passes use the ordinary morph policy even
    // though the immutable contract remains attached to the rendered snapshot.
    const isActiveFullScreenBoundary =
      fullScreenBoundaryTransition &&
      transitionGeneration > 0 &&
      transitionCompletedGeneration.value < transitionGeneration;
    const animation = isActiveFullScreenBoundary
      ? buildFullScreenTransition(values)
      : buildTransition(values);

    const geometryCandidates = [
      {
        key: "originY" as const,
        source: values.currentOriginY,
        target: values.targetOriginY,
      },
      {
        key: "height" as const,
        source: values.currentHeight,
        target: values.targetHeight,
      },
      {
        key: "width" as const,
        source: values.currentWidth,
        target: values.targetWidth,
      },
    ];
    const geometryClock =
      geometryCandidates.find(
        ({ source, target }) => Math.abs(target - source) >= 0.001,
      ) ?? geometryCandidates[0];
    const geometryAnimation = animation.animations[geometryClock.key];

    if (geometryAnimation !== undefined) {
      // Consumers follow the same geometry value the shell actually renders.
      const progressAnimation = withTrayLayoutProgress(
        geometryAnimation as number,
        morphProgress,
        geometryClock.source,
        geometryClock.target,
      );

      animation.animations[geometryClock.key] =
        transitionGeneration > 0
          ? withTrayTransitionStart(
              progressAnimation,
              transitionStartedGeneration,
              transitionStartedAt,
              transitionLayoutStartedGeneration,
              transitionCompletedGeneration,
              transitionGeneration,
              "layout",
              onStart,
            )
          : progressAnimation;
    }

    return {
      ...animation,
      callback: (finished) => {
        if (finished && onComplete) {
          scheduleOnRN(onComplete, performance.now());
        }
      },
    };
  };

  return synchronizedTransition;
};
