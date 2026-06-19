import React from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useTrayFlow, useTrayPages } from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";

const PageProgressItem = ({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - index), 1);

    return {
      width: interpolate(distance, [0, 1], [42, 22]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        ["#41BBFF", "#DCDDDF"],
      ),
    };
  }, [index, progress]);

  return (
    <Animated.View
      style={[
        {
          height: 4,
          borderRadius: 999,
        },
        animatedStyle,
      ]}
    />
  );
};

const PageProgress = ({
  totalPages,
  progress,
}: {
  totalPages: number;
  progress: SharedValue<number>;
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flex: 1,
      }}
    >
      {Array.from({ length: totalPages }, (_, index) => (
        <PageProgressItem key={index} index={index} progress={progress} />
      ))}
    </View>
  );
};

export const OnboardingPageHeader = ({
  rightAccessory,
}: {
  rightAccessory?: React.ReactNode;
}) => {
  const { requestClose } = useTrayFlow();
  const { pageIndex, totalPages, backPage, progress } = useTrayPages();
  const isFirstPage = pageIndex === 0;

  return (
    <View
      style={{
        paddingTop: 24,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <PressableScale
        onPress={isFirstPage ? requestClose : backPage}
        style={{
          width: 32,
          height: 32,
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name="xmark"
          type="palette"
          size={22}
          weight="semibold"
          tintColor="#2A2A2C"
        />
      </PressableScale>

      <PageProgress totalPages={totalPages} progress={progress} />

      <View
        style={{
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rightAccessory ?? (
          <SymbolView
            name="questionmark.circle"
            type="palette"
            size={32}
            tintColor="#2A2A2C"
          />
        )}
      </View>
    </View>
  );
};
