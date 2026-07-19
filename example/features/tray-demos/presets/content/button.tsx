import React, { useLayoutEffect, useRef } from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useTrayMorphProgress } from "morpheus";
import { Laminar } from "react-native-laminar";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import * as Haptics from "expo-haptics";

const { width: windowWidth } = Dimensions.get("window");

export const BUTTON_HEIGHT = 50;
export const BUTTON_WIDTH = windowWidth * 0.82;
export const MIN_BUTTON_WIDTH = windowWidth * 0.4;

const GAP = 10;
const SECONDARY_WIDTH = BUTTON_WIDTH - MIN_BUTTON_WIDTH - GAP;

type Props = {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onFinish?: () => void;
  onSecondaryPress?: () => void;
  showSecondary?: boolean;
  primaryColor?: string;
};

// this preset preserves footer width so step changes do not reflow the tray
export const AnimatedOnboardingButton: React.FC<Props> = ({
  step,
  totalSteps,
  onNext,
  onFinish,
  onSecondaryPress,
  showSecondary,
  primaryColor = "#3EB1FF",
}) => {
  const isLastStep = step === totalSteps - 1;

  // callers can override the default onboarding rule without forking the preset
  const shouldShowSecondary =
    showSecondary !== undefined ? showSecondary : step > 0 && !isLastStep;
  const morphProgress = useTrayMorphProgress();
  const initialSecondaryValue = shouldShowSecondary ? 1 : 0;
  const secondaryFrom = useSharedValue(initialSecondaryValue);
  const secondaryTo = useSharedValue(initialSecondaryValue);
  const previousSecondaryConfigRef = useRef({
    step,
    target: initialSecondaryValue,
  });

  useLayoutEffect(() => {
    const nextTarget = shouldShowSecondary ? 1 : 0;
    const previousConfig = previousSecondaryConfigRef.current;

    if (previousConfig.step === step && previousConfig.target === nextTarget) {
      // Incidental rerenders during one morph must not rewrite its endpoints.
      return;
    }

    secondaryFrom.value = previousConfig.target;
    secondaryTo.value = nextTarget;
    previousSecondaryConfigRef.current = { step, target: nextTarget };
  }, [secondaryFrom, secondaryTo, shouldShowSecondary, step]);

  const progress = useDerivedValue(() =>
    interpolate(
      morphProgress.value,
      [0, 1],
      [secondaryFrom.value, secondaryTo.value],
    ),
  );

  const rPrimaryStyle = useAnimatedStyle(() => {
    const width = interpolate(
      progress.value,
      [0, 1],
      [BUTTON_WIDTH, MIN_BUTTON_WIDTH],
    );

    return { width };
  });

  const rSecondaryStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  const handlePrimaryPress = async () => {
    await Haptics.selectionAsync();
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
      {/* the secondary slot stays in layout so the primary width transition stays smooth */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            width: SECONDARY_WIDTH,
            height: BUTTON_HEIGHT,
            justifyContent: "center",
          },
          rSecondaryStyle,
        ]}
        pointerEvents={shouldShowSecondary ? "auto" : "none"}
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
          <Text className="text-black font-sfBold text-2xl">Cancel</Text>
        </PressableScale>
      </Animated.View>

      {/* the primary action expands into the released space instead of remounting */}
      <Animated.View
        style={[
          rPrimaryStyle,
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
            backgroundColor: primaryColor,
            borderRadius: 50,
            justifyContent: "center",
          }}
        >
          <Laminar
            text={isLastStep ? "Continue" : "Continue"}
            className="text-white font-sfBold text-2xl"
            align="center"
         
          />
        </PressableScale>
      </Animated.View>
    </View>
  );
};
