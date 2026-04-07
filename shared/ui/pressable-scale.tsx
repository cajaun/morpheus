import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type PressableScaleProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const ANIMATION_DURATION = 250;

const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  onPress,
  style,
  className,
}) => {
  const active = useSharedValue(false);

  const gesture = Gesture.Tap()
    .maxDuration(4000)
    .onTouchesDown(() => {
      active.value = true;
    })
    .onTouchesUp(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    })
    .onFinalize(() => {
      active.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(active.value ? 0.95 : 1, {
          duration: ANIMATION_DURATION,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View className={className} style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export { PressableScale };
