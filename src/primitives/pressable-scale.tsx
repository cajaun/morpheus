import React from "react";
import {
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// shared press feedback keeps tray actions consistent without coupling them to one button implementation
export type TrayPressableScaleProps = Omit<
  PressableProps,
  "children" | "onPress" | "style"
> & {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const ANIMATION_DURATION = 250;
// press-in starts on the touch-down frame: a quick tap is released in well
// under 100 ms, and any activation delay would leave it with no feedback at
// all before the action runs
const PRESS_IN_DURATION = 120;
const TAP_MAX_DISTANCE = 8;

export const TrayPressableScale: React.FC<TrayPressableScaleProps> = ({
  children,
  onPress,
  style,
  className,
  disabled = false,
  ...props
}) => {
  const active = useSharedValue(false);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(4000)
    .maxDistance(TAP_MAX_DISTANCE)
    .onBegin(() => {
      active.value = true;
    })
    .onEnd((_event, success) => {
      active.value = false;

      if (success && onPress) {
        scheduleOnRN(onPress);
      }
    })
    .onFinalize(() => {
      active.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: active.value
          ? withTiming(0.95, {
              duration: PRESS_IN_DURATION,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            })
          : withTiming(1, {
              duration: ANIMATION_DURATION,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
      },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        {...props}
        className={className}
        style={[style, animatedStyle]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

TrayPressableScale.displayName = "TrayPressableScale";
