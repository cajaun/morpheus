import React from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayNavigationActions,
  useTrayPages,
} from "react-native-morpheus";
import {
  FULL_SCREEN_HEADER_PADDING_TOP,
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CLOSE_ICON_SIZE,
} from "react-native-morpheus/constants";

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
      width: interpolate(distance, [0, 1], [32, 16]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        ["#4FAFF8", "#D9D9D9"],
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
        gap: 4,
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
  const { requestClose } = useTrayNavigationActions();
  const { pageIndex, totalPages, backPage, progress } = useTrayPages();
  const isFirstPage = pageIndex === 0;

  return (
    <View
      style={{
        paddingTop: FULL_SCREEN_HEADER_PADDING_TOP,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Tray.HeaderButton
        onPress={isFirstPage ? requestClose : backPage}
      >
        <SymbolView
          name="xmark"
          type="palette"
          weight="bold"
          tintColor="#787878"
          size={TRAY_HEADER_CLOSE_ICON_SIZE}
        />
      </Tray.HeaderButton>

      {showProgress ? (
        <PageProgress totalPages={totalPages} progress={progress} />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View
        style={{
          width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
          height: TRAY_HEADER_CLOSE_BUTTON_SIZE,
          borderRadius: TRAY_HEADER_CLOSE_BUTTON_SIZE / 2,
          backgroundColor: "#F2F2F2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rightAccessory ?? (
          <SymbolView
            name="questionmark"
            type="palette"
            tintColor="#787878"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            weight="bold"
          />
        )}
      </View>
    </View>
  );
};
