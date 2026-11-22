import React from "react";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ABSOLUTE_FILL, BACKDROP_OPACITY } from "../core/constants";

// input blocking and opacity are separate backdrop concerns
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
              ...ABSOLUTE_FILL,
              backgroundColor: `rgba(0, 0, 0, ${BACKDROP_OPACITY})`,
            },
            rBackdropStyle,
          ]}
        />

        <Pressable
          onPress={onTap}
          pointerEvents={interactive && isRendered ? "auto" : "none"}
          style={[
            ABSOLUTE_FILL,
            {
              bottom,
            },
          ]}
        />
      </>
    );
  },
);

Backdrop.displayName = "Backdrop";

export { Backdrop };
