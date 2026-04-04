import React from "react";
import { Text, Dimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";
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
  total?: number;
  onNext: () => void;
  onFinish?: () => void;
  onSecondaryPress?: () => void;

  /** NEW */
  showSecondary?: boolean;
};

export const AnimatedOnboardingButton: React.FC<Props> = ({
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

  // If showSecondary prop is provided, use it.
  // Otherwise fallback to previous logic.
  const shouldShowSecondary =
    showSecondary !== undefined
      ? showSecondary
      : step > 0 && !isLastStep;

  const progress = useDerivedValue(() =>
    withSpring(shouldShowSecondary ? 1 : 0, {
      stiffness: 1600,
      damping: 80,
    }),
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

  if (isLastStep) {
    onFinish?.();  
  } else {
    onNext();     
  }
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
      {/* Secondary */}
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
          <Text className="text-black font-sfSemibold " style={{     fontSize: 22, lineHeight: 28, letterSpacing: 0.2 }}>
            Cancel
          </Text>
        </PressableScale>
      </Animated.View>

      {/* Primary */}
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
            backgroundColor: "#41BBFF",
            borderRadius: 50,
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text className="text-white font-sfSemibold  " style={{     fontSize: 22, lineHeight: 28, letterSpacing: 0.2 }}>
            Continue
          </Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
};
