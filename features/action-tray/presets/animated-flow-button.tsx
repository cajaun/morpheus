import React from "react";
import { Dimensions, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
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

const GAP = 10;
const SECONDARY_WIDTH = BUTTON_WIDTH - MIN_BUTTON_WIDTH - GAP;

type Props = {
  step: number;
  totalSteps: number;
  total?: number;
  onNext: () => void;
  onFinish?: () => void;
  onSecondaryPress?: () => void;
  showSecondary?: boolean;
};

// this footer keeps one stable footprint while the secondary action appears
export const AnimatedFlowButton: React.FC<Props> = ({
  step,
  totalSteps,
  total,
  onNext,
  onFinish,
  onSecondaryPress,
  showSecondary,
}) => {
  const resolvedTotalSteps =
    totalSteps > 0 ? totalSteps : (total ?? totalSteps);
  const isLastStep =
    resolvedTotalSteps > 0 && step >= resolvedTotalSteps - 1;
  const shouldShowSecondary =
    showSecondary !== undefined ? showSecondary : step > 0 && !isLastStep;

  const progress = useDerivedValue(() =>
    withTiming(shouldShowSecondary ? 1 : 0, {
      duration: 200,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
    }),
  );

  const primaryStyle = useAnimatedStyle(() => ({
    width: Math.round(
      interpolate(
        progress.value,
        [0, 1],
        [BUTTON_WIDTH, MIN_BUTTON_WIDTH],
      ),
    ),
  }));

  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0, 1]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.97, 1]),
      },
    ],
  }));

  const handlePrimaryPress = async () => {
    await Haptics.selectionAsync();

    if (isLastStep) {
      onFinish?.();
      return;
    }

    onNext();
  };

  const handleSecondaryPress = async () => {
    await Haptics.selectionAsync();
    onSecondaryPress?.();
  };

  return (
    <View
      style={{
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        justifyContent: "center",
      }}
    >
      <Animated.View
        pointerEvents={shouldShowSecondary ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            left: 0,
            width: SECONDARY_WIDTH,
            height: BUTTON_HEIGHT,
            justifyContent: "center",
          },
          secondaryStyle,
        ]}
      >
        <PressableScale
          onPress={handleSecondaryPress}
          style={{
            width: "100%",
            height: BUTTON_HEIGHT,
            borderRadius: 50,
            backgroundColor: "#F5F5FA",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text className="text-black font-sf-bold" style={trayDemoText.button}>
            Cancel
          </Text>
        </PressableScale>
      </Animated.View>

      <Animated.View
        style={[
          primaryStyle,
          {
            position: "absolute",
            right: 0,
            height: BUTTON_HEIGHT,
          },
        ]}
      >
        <PressableScale
          onPress={handlePrimaryPress}
          style={{
            width: "100%",
            height: BUTTON_HEIGHT,
            alignItems: "center",
            backgroundColor: trayDemoColors.primaryAction,
            borderRadius: 50,
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text className="text-white font-sf-bold" style={trayDemoText.button}>
            Continue
          </Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
};
