import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTrayDemoTheme } from "../../theme";
import { useSearchAnimation } from "../animation/search-animation-provider";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const AnimatedBlur = () => {
  const theme = useTrayDemoTheme();
  const { blurIntensity } = useSearchAnimation();

  const backdropAnimatedProps = useAnimatedProps(() => ({
    intensity: Platform.OS === "ios" ? blurIntensity.value : 0,
  }));

  const androidStyle = useAnimatedStyle(() => {
    if (Platform.OS !== "android") {
      return { opacity: 0 };
    }

    return {
      opacity: blurIntensity.value / 100,
    };
  });

  if (Platform.OS === "android") {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.androidVeil },
          androidStyle,
        ]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AnimatedBlurView
        tint={theme.fullScreenBlurTint}
        style={StyleSheet.absoluteFill}
        animatedProps={backdropAnimatedProps}
      />
    </View>
  );
};
