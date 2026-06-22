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
import { FULL_SCREEN_CONTROL_SIZE } from "@/features/action-tray/system/core/constants";

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
          height: 3,
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
  showProgress = true,
}: {
  rightAccessory?: React.ReactNode;
  showProgress?: boolean;
}) => {
  const { requestClose } = useTrayFlow();
  const { pageIndex, totalPages, backPage, progress } = useTrayPages();
  const isFirstPage = pageIndex === 0;

  return (
    <View
      style={{
        paddingTop: 4,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <PressableScale
        onPress={isFirstPage ? requestClose : backPage}
        style={{
          width: FULL_SCREEN_CONTROL_SIZE,
          height: FULL_SCREEN_CONTROL_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name="xmark"
          type="palette"
          weight="semibold"
          tintColor="#2A2A2C"
        />
      </PressableScale>

      {showProgress ? (
        <PageProgress totalPages={totalPages} progress={progress} />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View
        style={{
          width: FULL_SCREEN_CONTROL_SIZE,
          height: FULL_SCREEN_CONTROL_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rightAccessory ?? (
          <SymbolView
            name="questionmark.circle"
            type="palette"
            tintColor="#2A2A2C"
          />
        )}
      </View>
    </View>
  );
};
