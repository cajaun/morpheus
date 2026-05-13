import React from "react";
import {
  Dimensions,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoText,
} from "@/shared/theme/tokens";

const { width: windowWidth } = Dimensions.get("window");

export const BUTTON_HEIGHT = 50;
export const BUTTON_WIDTH = windowWidth * 0.82;
export const MIN_BUTTON_WIDTH = windowWidth * 0.4;

export const BUTTON_GAP = 10;

export type AnimatedFlowButtonAction = {
  label?: string;
  onPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
  frameStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export type AnimatedFlowButtonLayout = {
  width?: number;
  height?: number;
  gap?: number;
  primaryCollapsedWidth?: number;
  alignItems?: ViewStyle["alignItems"];
  justifyContent?: ViewStyle["justifyContent"];
};

export type AnimatedFlowButtonAnimation = {
  duration?: number;
  splitProgress?: SharedValue<number> | null;
  secondaryOpacityRange?: [number, number, number];
  secondaryScaleRange?: [number, number];
};

export type AnimatedFlowButtonProps = {
  step: number;
  totalSteps: number;
  total?: number;
  layout?: AnimatedFlowButtonLayout;
  animation?: AnimatedFlowButtonAnimation;
  primaryAction?: AnimatedFlowButtonAction;
  secondaryAction?: AnimatedFlowButtonAction & {
    visible?: boolean;
  };
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;

  /** @deprecated Use layout.width. */
  width?: number;
  /** @deprecated Use layout.primaryCollapsedWidth. */
  minimumPrimaryWidth?: number;
  /** @deprecated Use animation.duration. */
  animationDuration?: number;
  /** @deprecated Use animation.splitProgress. */
  splitProgress?: SharedValue<number> | null;
  /** @deprecated Use primaryAction.onPress. */
  onNext?: () => void;
  /** @deprecated Use primaryAction.onPress for the last step. */
  onFinish?: () => void;
  /** @deprecated Use secondaryAction.onPress. */
  onSecondaryPress?: () => void;
  /** @deprecated Use primaryAction.backgroundColor. */
  primaryBackgroundColor?: string;
  /** @deprecated Use secondaryAction.backgroundColor. */
  secondaryBackgroundColor?: string;
  /** @deprecated Use secondaryAction.visible. */
  showSecondary?: boolean;
};

// this footer keeps one stable footprint while the secondary action appears
export const AnimatedFlowButton: React.FC<AnimatedFlowButtonProps> = ({
  step,
  totalSteps,
  total,
  layout,
  animation,
  primaryAction,
  secondaryAction,
  haptics = true,
  style,
  width: legacyWidth,
  minimumPrimaryWidth,
  animationDuration = 200,
  splitProgress,
  onNext,
  onFinish,
  onSecondaryPress,
  primaryBackgroundColor = trayDemoColors.primaryAction,
  secondaryBackgroundColor = "#F5F5FA",
  showSecondary,
}) => {
  const width = layout?.width ?? legacyWidth ?? BUTTON_WIDTH;
  const height = layout?.height ?? BUTTON_HEIGHT;
  const gap = layout?.gap ?? BUTTON_GAP;
  const alignItems = layout?.alignItems;
  const justifyContent = layout?.justifyContent ?? "center";
  const primaryCollapsedWidth =
    layout?.primaryCollapsedWidth ??
    minimumPrimaryWidth ??
    Math.round(width * 0.49);
  const secondaryWidth = width - primaryCollapsedWidth - gap;
  const resolvedPrimaryAction = {
    label: "Continue",
    onPress: onNext,
    backgroundColor: primaryBackgroundColor,
    textColor: "#FFFFFF",
    className: "text-white font-sf-bold",
    ...primaryAction,
  };
  const resolvedSecondaryAction = {
    label: "Cancel",
    onPress: onSecondaryPress,
    backgroundColor: secondaryBackgroundColor,
    textColor: "#000000",
    className: "text-black font-sf-bold",
    ...secondaryAction,
  };
  const resolvedTotalSteps =
    totalSteps > 0 ? totalSteps : (total ?? totalSteps);
  const isLastStep =
    resolvedTotalSteps > 0 && step >= resolvedTotalSteps - 1;
  const shouldShowSecondary =
    resolvedSecondaryAction.visible ??
    showSecondary ??
    (step > 0 && !isLastStep);
  const resolvedSplitProgress = animation?.splitProgress ?? splitProgress;
  const animationDurationMs = animation?.duration ?? animationDuration;
  const secondaryOpacityRange =
    animation?.secondaryOpacityRange ?? ([0, 0.6, 1] as const);
  const secondaryScaleRange =
    animation?.secondaryScaleRange ?? ([0.97, 1] as const);

  const progress = useDerivedValue(() =>
    resolvedSplitProgress
      ? shouldShowSecondary
        ? resolvedSplitProgress.value
        : 0
      : withTiming(shouldShowSecondary ? 1 : 0, {
          duration: animationDurationMs,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        }),
  );

  const primaryStyle = useAnimatedStyle(() => ({
    width: Math.round(
      interpolate(
        progress.value,
        [0, 1],
        [width, primaryCollapsedWidth],
      ),
    ),
  }), [primaryCollapsedWidth, width]);

  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, secondaryOpacityRange, [0, 0, 1]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], secondaryScaleRange),
      },
    ],
  }), [secondaryOpacityRange, secondaryScaleRange]);

  const handlePrimaryPress = async () => {
    if (haptics) {
      await Haptics.selectionAsync();
    }

    if (isLastStep) {
      onFinish?.();
      return;
    }

    resolvedPrimaryAction.onPress?.();
  };

  const handleSecondaryPress = async () => {
    if (haptics) {
      await Haptics.selectionAsync();
    }

    resolvedSecondaryAction.onPress?.();
  };

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems,
          justifyContent,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents={shouldShowSecondary ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            left: 0,
            width: secondaryWidth,
            height,
            justifyContent: "center",
          },
          resolvedSecondaryAction.frameStyle,
          secondaryStyle,
        ]}
      >
        <PressableScale
          onPress={handleSecondaryPress}
          style={[
            {
              width: "100%",
              height,
              borderRadius: height / 2,
              backgroundColor: resolvedSecondaryAction.backgroundColor,
              justifyContent: "center",
              alignItems: "center",
            },
            resolvedSecondaryAction.style,
          ]}
        >
          <Text
            className={resolvedSecondaryAction.className}
            style={[
              trayDemoText.button,
              { color: resolvedSecondaryAction.textColor },
              resolvedSecondaryAction.textStyle,
            ]}
          >
            {resolvedSecondaryAction.label}
          </Text>
        </PressableScale>
      </Animated.View>

      <Animated.View
        style={[
          primaryStyle,
          {
            position: "absolute",
            right: 0,
            height,
          },
          resolvedPrimaryAction.frameStyle,
        ]}
      >
        <PressableScale
          onPress={handlePrimaryPress}
          style={[
            {
              width: "100%",
              height,
              alignItems: "center",
              backgroundColor: resolvedPrimaryAction.backgroundColor,
              borderRadius: height / 2,
              justifyContent: "center",
              paddingHorizontal: 20,
            },
            resolvedPrimaryAction.style,
          ]}
        >
          <Text
            className={resolvedPrimaryAction.className}
            style={[
              trayDemoText.button,
              { color: resolvedPrimaryAction.textColor },
              resolvedPrimaryAction.textStyle,
            ]}
          >
            {resolvedPrimaryAction.label}
          </Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
};
