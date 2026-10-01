import {
  Easing,
  LinearTransition,
  type AnimationObject,
  type LayoutAnimationFunction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { MORPH_LAYOUT_DURATION } from "../constants";
import { withTrayTransitionStart } from "../transition-start";
import { withTrayLayoutProgress } from "./with-tray-layout-progress";

type TrayLayoutTransitionParams = {
  transitionGeneration: number;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  morphProgress: SharedValue<number>;
  onConfigure?: (configuredAt: number, transitionGeneration: number) => void;
  onStart?: (startedAt: number, transitionGeneration: number) => void;
  onComplete?: (finishedAt: number, transitionGeneration: number) => void;
};

type GeometryKey = "originY" | "height" | "width";
type GeometryAnimationMap = Partial<Record<GeometryKey, AnimationObject>>;

// combine changing shell dimensions under one native transition clock
export const createTrayLayoutTransition = ({
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  morphProgress,
  onConfigure,
  onStart,
  onComplete,
}: TrayLayoutTransitionParams) => {
  const transition = LinearTransition
    .duration(MORPH_LAYOUT_DURATION)
    .easing(Easing.bezier(0.34, 1.12, 0.64, 1).factory());

  const buildTransition = transition.build();
  const synchronizedTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    if (onConfigure) {
      // configuration fires before native animation start so timing can split setup from motion
      scheduleOnRN(onConfigure, performance.now(), transitionGeneration);
    }

    // fullscreen boundaries are owned by usetrayboundarymotionstate native layout animation is intentionally reserved for ordinary sheet changes
    const animation = buildTransition(values);
    const geometryAnimations = animation.animations as unknown as
      GeometryAnimationMap;

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
    const geometryAnimation = geometryAnimations[geometryClock.key];

    if (geometryAnimation !== undefined) {
      // join changing geometry under one clock so the footer edge stays stable
      for (const candidate of geometryCandidates) {
        const candidateAnimation = geometryAnimations[candidate.key];
        const isGeometryClock = candidate.key === geometryClock.key;
        const hasGeometryChange =
          Math.abs(candidate.target - candidate.source) >= 0.001;

        if (
          candidateAnimation === undefined ||
          (!isGeometryClock && !hasGeometryChange)
        ) {
          continue;
        }

        const progressAnimation = isGeometryClock
          ? withTrayLayoutProgress(
              candidateAnimation as unknown as number,
              morphProgress,
              geometryClock.source,
              geometryClock.target,
            )
          : candidateAnimation;

        geometryAnimations[candidate.key] =
          transitionGeneration > 0
            ? (withTrayTransitionStart(
                progressAnimation as unknown as AnimationObject,
                transitionStartedGeneration,
                transitionStartedAt,
                transitionLayoutStartedGeneration,
                transitionCompletedGeneration,
                transitionGeneration,
                "layout",
                isGeometryClock && onStart
                  ? (startedAt, callbackGeneration) => {
                      "worklet";
                      scheduleOnRN(onStart, startedAt, callbackGeneration);
                    }
                  : undefined,
              ) as unknown as AnimationObject)
            : (progressAnimation as unknown as AnimationObject);
      }
    }

    return {
      ...animation,
      callback: (finished) => {
        if (finished && onComplete) {
          scheduleOnRN(
            onComplete,
            performance.now(),
            transitionGeneration,
          );
        }
      },
    };
  };

  return synchronizedTransition;
};
