import React from "react";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BackdropProps = {
  onTap: () => void;
  isRendered: boolean;
  interactive?: boolean;
  progress: SharedValue<number>;
};

const Backdrop: React.FC<BackdropProps> = React.memo(
  ({ isRendered, interactive = true, onTap, progress }) => {
    const { bottom } = useSafeAreaInsets();

    const rBackdropStyle = useAnimatedStyle(() => {
      return {
        opacity: progress.value,
      };
    }, [progress]);

    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.3)",
            },
            rBackdropStyle,
          ]}
        />

        <Pressable
          onPress={onTap}
          pointerEvents={interactive && isRendered ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFillObject,
            {
              bottom,
            },
          ]}
        />
      </>
    );
  },
);

export { Backdrop };
