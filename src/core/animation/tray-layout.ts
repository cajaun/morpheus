import {
  Easing,
  LinearTransition,
  withTiming,
  type AnimationObject,
  type LayoutAnimationFunction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { MORPH_LAYOUT_DURATION, SHEET_EASING_POINTS } from "../constants";
import {
  type TrayKeyboardGate,
  withTrayTransitionStart,
} from "../transition-start";
import { withTrayLayoutProgress } from "./with-tray-layout-progress";

type TrayLayoutTransitionParams = {
  transitionGeneration: number;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  morphProgress: SharedValue<number>;
  // armed for sheet steps that bring up or put away the keyboard
  keyboardGate?: TrayKeyboardGate;
  onConfigure?: (configuredAt: number, transitionGeneration: number) => void;
  onStart?: (startedAt: number, transitionGeneration: number) => void;
  onComplete?: (finishedAt: number, transitionGeneration: number) => void;
};

type GeometryKey = "originY" | "height" | "width";
type GeometryAnimationMap = Partial<Record<GeometryKey, AnimationObject>>;

// every changing shell dimension runs on one native transition clock
export const createTrayLayoutTransition = ({
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  morphProgress,
  keyboardGate,
  onConfigure,
  onStart,
  onComplete,
}: TrayLayoutTransitionParams) => {
  const transition = LinearTransition
    .duration(MORPH_LAYOUT_DURATION)
    .easing(Easing.bezier(...SHEET_EASING_POINTS).factory());

  const buildTransition = transition.build();
  const synchronizedTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    if (onConfigure) {
      // configuration fires before the native animation starts so timing separates setup from motion
      scheduleOnRN(onConfigure, performance.now(), transitionGeneration);
    }

    // an armed keyboard step starts the keyboard now so its start signal opens the gate this layout waits on
    if (
      keyboardGate?.onLayoutReady &&
      transitionGeneration > 0 &&
      keyboardGate.armedGeneration.value === transitionGeneration
    ) {
      scheduleOnRN(keyboardGate.onLayoutReady, transitionGeneration);
    }

    
    // fullscreen boundaries belong to useTrayBoundaryMotionState, native layout animation serves sheet changes
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
      // changing geometry joins one clock so the footer edge holds and the header morphs with the body
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
                false,
                false,
                keyboardGate,
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

type TrayLayoutFollowerParams = Pick<
  TrayLayoutTransitionParams,
  | "transitionGeneration"
  | "transitionStartedAt"
  | "transitionStartedGeneration"
  | "transitionLayoutStartedGeneration"
  | "transitionCompletedGeneration"
>;

// a view inside the sheet that holds the sheet's bottom edge, its frame moves on the sheet's curve from the moment the sheet's layout starts, joined to the same clock start, and it never publishes or completes the transition
export const createTrayLayoutFollowerTransition = ({
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
}: TrayLayoutFollowerParams) => {
  const buildTransition = LinearTransition.duration(MORPH_LAYOUT_DURATION)
    .easing(Easing.bezier(...SHEET_EASING_POINTS).factory())
    .build();

  const followerTransition: LayoutAnimationFunction = (values) => {
    "worklet";

    const animation = buildTransition(values);

    if (transitionGeneration <= 0) {
      return animation;
    }

    const geometryAnimations = animation.animations as unknown as Partial<
      Record<string, AnimationObject>
    >;
    const geometry = [
      { key: "originY", source: values.currentOriginY, target: values.targetOriginY },
      { key: "height", source: values.currentHeight, target: values.targetHeight },
      { key: "originX", source: values.currentOriginX, target: values.targetOriginX },
      { key: "width", source: values.currentWidth, target: values.targetWidth },
    ];

    for (const { key, source, target } of geometry) {
      const keyAnimation = geometryAnimations[key];

      if (keyAnimation === undefined || Math.abs(target - source) < 0.001) {
        continue;
      }

      // waits for the sheet's layout to start, then runs from the shared clock start so a late first frame still lands on the sheet's curve
      geometryAnimations[key] =
        withTrayTransitionStart(
          keyAnimation,
          transitionStartedGeneration,
          transitionStartedAt,
          transitionLayoutStartedGeneration,
          transitionCompletedGeneration,
          transitionGeneration,
          "outgoing",
          undefined,
          false,
          true,
        ) as unknown as AnimationObject;
    }

    return animation;
  };

  return followerTransition;
};

type TrayLayoutWithoutResizeParams = {
  transitionGeneration: number;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  morphProgress: SharedValue<number>;
  keyboardGate?: TrayKeyboardGate;
  onComplete?: (finishedAt: number, transitionGeneration: number) => void;
};

// a step at an unchanged height gets no native layout transition, so this participant opens the content barrier, starts and completes the clock on morphProgress with the sheet's duration and curve
export const startTrayLayoutWithoutResize = ({
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  morphProgress,
  keyboardGate,
  onComplete,
}: TrayLayoutWithoutResizeParams) => {
  if (
    transitionGeneration <= 0 ||
    transitionLayoutStartedGeneration.value >= transitionGeneration ||
    transitionCompletedGeneration.value >= transitionGeneration
  ) {
    return false;
  }

  if (
    keyboardGate?.onLayoutReady &&
    keyboardGate.armedGeneration.value === transitionGeneration
  ) {
    keyboardGate.onLayoutReady(transitionGeneration);
  }

  morphProgress.value = withTrayTransitionStart(
    withTiming(
      1,
      {
        duration: MORPH_LAYOUT_DURATION,
        easing: Easing.bezier(...SHEET_EASING_POINTS),
      },
      (finished) => {
        "worklet";

        if (finished && onComplete) {
          scheduleOnRN(onComplete, performance.now(), transitionGeneration);
        }
      },
    ),
    transitionStartedGeneration,
    transitionStartedAt,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
    transitionGeneration,
    "layout",
    undefined,
    false,
    false,
    keyboardGate,
  );

  return true;
};
