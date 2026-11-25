import React, { useLayoutEffect, useRef } from "react";
import {
  Dimensions,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useTrayMorphProgress } from "react-native-morpheus";
import { TRAY_PRIMARY_BUTTON_HEIGHT } from "react-native-morpheus/constants";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";

const { width: windowWidth } = Dimensions.get("window");

export const BUTTON_HEIGHT = TRAY_PRIMARY_BUTTON_HEIGHT;
export const BUTTON_WIDTH = windowWidth * 0.82;

const GAP = 10;
// the primary keeps just under half the row once split
const COLLAPSED_RATIO = 0.49;
const HIDDEN_SCALE = 0.96;

export type CleaveButtonAction = {
  label?: string;
  onPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
  textStyle?: StyleProp<TextStyle>;
};

export type CleaveButtonProps = {
  // the step drives the split on the tray's morph clock, a split on every step but the first and last
  step?: number;
  totalSteps?: number;
  // overrides the step rule
  split?: boolean;
  // drives the split from another clock instead, such as the origin progress of a tray opening from its trigger
  splitProgress?: SharedValue<number> | number;
  // the row width at rest
  width?: number;
  // a live row width, for a row whose container resizes on the UI thread such as a footer morphing out of its trigger
  widthValue?: SharedValue<number>;
  primaryAction?: CleaveButtonAction;
  secondaryAction?: CleaveButtonAction;
  // called instead of the primary action on the last step
  onFinish?: () => void;
  haptics?: boolean;
};

type ResolvedAction = Required<
  Pick<CleaveButtonAction, "label" | "backgroundColor" | "textColor">
> &
  CleaveButtonAction;

const isSharedValue = (
  value: SharedValue<number> | number | undefined,
): value is SharedValue<number> =>
  typeof value === "object" && value !== null && "value" in value;

// one primary that splits to uncover a secondary beneath it, Continue and Cancel by default
export const CleaveButton: React.FC<CleaveButtonProps> = (props) => {
  const split = resolveSplit(props);

  return props.splitProgress !== undefined ? (
    <CleaveButtonFromProgress {...props} split={split} />
  ) : (
    <CleaveButtonFromMorph {...props} split={split} />
  );
};

const resolveSplit = ({
  split,
  step = 0,
  totalSteps = 1,
}: CleaveButtonProps) => {
  if (split !== undefined) {
    return split;
  }

  const isLastStep = totalSteps > 0 && step >= totalSteps - 1;

  return step > 0 && !isLastStep;
};

// a step change sets where the split starts and ends and the tray morph carries it
const CleaveButtonFromMorph = (props: CleaveButtonProps & { split: boolean }) => {
  const { split, step = 0 } = props;
  const morphProgress = useTrayMorphProgress();
  const initial = split ? 1 : 0;
  const from = useSharedValue(initial);
  const to = useSharedValue(initial);
  const previousRef = useRef({ step, target: initial });

  useLayoutEffect(() => {
    const target = split ? 1 : 0;
    const previous = previousRef.current;

    if (previous.step === step && previous.target === target) {
      return;
    }

    from.set(previous.target);
    to.set(target);
    previousRef.current = { step, target };
  }, [from, split, step, to]);

  const progress = useDerivedValue(() =>
    interpolate(morphProgress.get(), [0, 1], [from.get(), to.get()]),
  );

  return <CleaveButtonView {...props} progress={progress} />;
};

// an outside clock carries the split while the button is split, a button that never splits stays whole
const CleaveButtonFromProgress = (
  props: CleaveButtonProps & { split: boolean },
) => {
  const { split, splitProgress } = props;
  // which kind of clock it is is settled on the JS thread, the worklet only reads it
  const source = isSharedValue(splitProgress) ? splitProgress : null;
  const fixed = typeof splitProgress === "number" ? splitProgress : 1;
  const progress = useDerivedValue(() => {
    if (!split) {
      return 0;
    }

    return source ? source.get() : fixed;
  });

  return <CleaveButtonView {...props} progress={progress} />;
};

const CleaveButtonView = ({
  split,
  progress,
  step = 0,
  totalSteps = 1,
  width: restWidth = BUTTON_WIDTH,
  widthValue,
  primaryAction,
  secondaryAction,
  onFinish,
  haptics = true,
}: CleaveButtonProps & {
  split: boolean;
  progress: SharedValue<number>;
}) => {
  const height = BUTTON_HEIGHT;
  const primary: ResolvedAction = {
    label: "Continue",
    backgroundColor: trayDemoColors.primaryAction,
    textColor: "#FFFFFF",
    className: "font-bold",
    ...primaryAction,
  };
  const secondary: ResolvedAction = {
    label: "Cancel",
    backgroundColor: "#F5F5FA",
    textColor: "#000000",
    className: "font-bold",
    ...secondaryAction,
  };
  const isLastStep = totalSteps > 0 && step >= totalSteps - 1;

  // the row is laid out once at its rest width, a live width moves both edges about the center
  const rowWidth = useDerivedValue(() =>
    widthValue ? widthValue.get() : restWidth,
  );
  const rowLeft = useDerivedValue(() => (restWidth - rowWidth.get()) / 2);
  const rowRight = useDerivedValue(() => (restWidth + rowWidth.get()) / 2);
  const collapsedWidth = useDerivedValue(() =>
    Math.round(rowWidth.get() * COLLAPSED_RATIO),
  );

  // the primary holds the right edge and gives up its left
  const primaryLeft = useDerivedValue(
    () =>
      rowRight.get() -
      interpolate(
        progress.get(),
        [0, 1],
        [rowWidth.get(), collapsedWidth.get()],
      ),
  );
  const secondaryRight = useDerivedValue(
    () => rowRight.get() - collapsedWidth.get() - GAP,
  );

  const handlePrimaryPress = async () => {
    if (haptics) {
      await Haptics.selectionAsync();
    }

    if (isLastStep && onFinish) {
      onFinish();
      return;
    }

    primary.onPress?.();
  };

  const handleSecondaryPress = async () => {
    if (haptics) {
      await Haptics.selectionAsync();
    }

    secondary.onPress?.();
  };

  const restCollapsedWidth = Math.round(restWidth * COLLAPSED_RATIO);

  return (
    <View style={{ width: restWidth, height }}>
      {/* the secondary sits beneath the primary and is uncovered as it shrinks */}
      <View
        pointerEvents={split ? "auto" : "none"}
        style={{
          position: "absolute",
          left: 0,
          height,
          width: restWidth - restCollapsedWidth - GAP,
        }}
      >
        <PressableScale
          onPress={handleSecondaryPress}
          style={{ height, overflow: "visible", width: "100%" }}
        >
          <CleavePill
            action={secondary}
            left={rowLeft}
            right={secondaryRight}
            progress={progress}
            restWidth={restWidth}
            growsIn
          />
        </PressableScale>
      </View>

      <PressableScale
        onPress={handlePrimaryPress}
        style={{
          position: "absolute",
          right: 0,
          height,
          overflow: "visible",
          // the tap area changes once per step to free the secondary half
          width: split ? restCollapsedWidth : restWidth,
        }}
      >
        <CleavePill
          action={primary}
          left={primaryLeft}
          right={rowRight}
          progress={progress}
          restWidth={restWidth}
          anchor="right"
        />
      </PressableScale>
    </View>
  );
};

// a pill spanning left to right in row coordinates, drawn as two caps and a stretched middle since an animated width trips the React Native layout asserts
const CleavePill = ({
  action,
  left,
  right,
  progress,
  restWidth,
  anchor = "left",
  growsIn = false,
}: {
  action: ResolvedAction;
  left: SharedValue<number>;
  right: SharedValue<number>;
  progress: SharedValue<number>;
  restWidth: number;
  // the pill's frame inside its tap area, which sits at the row's left or right edge
  anchor?: "left" | "right";
  // grows from slightly small as it is uncovered
  growsIn?: boolean;
}) => {
  const height = BUTTON_HEIGHT;
  const middleWidth = restWidth - height;

  const pillStyle = useAnimatedStyle(() => {
    if (!growsIn) {
      return { transform: [{ translateX: 0 }, { scale: 1 }] };
    }

    // scales about the pill's own center, the frame is the full row
    const scale = interpolate(progress.get(), [0, 1], [HIDDEN_SCALE, 1]);
    const center = (left.get() + right.get()) / 2;

    return {
      transform: [
        { translateX: (center - restWidth / 2) * (1 - scale) },
        { scale },
      ],
    };
  });
  const leftCapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: left.get() }],
  }));
  const middleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: left.get() },
      {
        scaleX: Math.max(0, right.get() - left.get() - height) / middleWidth,
      },
    ],
  }));
  const rightCapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: right.get() - restWidth }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (left.get() + right.get()) / 2 - restWidth / 2 },
    ],
  }));

  const cap = {
    backgroundColor: action.backgroundColor,
    borderRadius: height / 2,
    height,
    position: "absolute" as const,
    width: height,
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          [anchor]: 0,
          width: restWidth,
          height,
        },
        pillStyle,
      ]}
    >
      <Animated.View style={[cap, { left: 0 }, leftCapStyle]} />
      <Animated.View
        style={[
          {
            backgroundColor: action.backgroundColor,
            height,
            left: height / 2,
            position: "absolute",
            transformOrigin: "left",
            width: middleWidth,
          },
          middleStyle,
        ]}
      />
      <Animated.View
        style={[cap, { left: restWidth - height }, rightCapStyle]}
      />
      <Animated.View
        style={[
          {
            alignItems: "center",
            height,
            justifyContent: "center",
            position: "absolute",
            width: restWidth,
          },
          labelStyle,
        ]}
      >
        <Text
          className={action.className}
          style={[trayDemoText.Button, { color: action.textColor }, action.textStyle]}
        >
          {action.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};
