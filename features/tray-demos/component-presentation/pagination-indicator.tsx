import { Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

type PaginationIndicatorProps = {
  index: number;
  itemSize: number;
  label: string;
  scrollY: SharedValue<number>;
};

export const PaginationIndicator = ({
  index,
  itemSize,
  label,
  scrollY,
}: PaginationIndicatorProps) => {
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value / itemSize,
      [index - 2, index - 1, index, index + 1, index + 2],
      [0.2, 0.5, 1, 0.5, 0.2],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleX: interpolate(
          scrollY.value / itemSize,
          [index - 2, index - 1, index, index + 1, index + 2],
          [1, 1.4, 2, 1.4, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value / itemSize,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          scrollY.value / itemSize,
          [index - 2, index - 1, index, index + 1, index + 2],
          [1, 1.4, 2, 1.4, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={{ alignItems: "center", flexDirection: "row" }}>
      <Animated.View
        style={[
          {
            backgroundColor: "#151515",
            height: 2,
            transformOrigin: ["0%", "50%", 0],
            width: 12,
          },
          barStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            left: 32,
            position: "absolute",
            right: 0,
          },
          labelStyle,
        ]}
      >
        <Text
          className="font-sf-medium"
          numberOfLines={1}
          style={{ color: "#151515", fontSize: 18 }}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
};
