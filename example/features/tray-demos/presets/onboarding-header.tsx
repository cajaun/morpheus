import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Tray } from "react-native-morpheus";
import { trayDemoText } from "@/shared/theme/tokens";
import {
  TRAY_HEADER_CLOSE_ICON_SIZE,
} from "react-native-morpheus/constants";

type Props = {
  step: number;
  onClose: () => void;
  onBack?: () => void;
  leftLabel?: React.ReactNode | string;
  shouldClose?: boolean;
};

export default function OnboardingHeader({
  step = 0,
  onClose,
  onBack,
  leftLabel,
  shouldClose,
}: Props) {
  const showBack = step > 0;
  // one progress signal keeps header motion coordinated instead of ad hoc
  const progress = useSharedValue(showBack ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(showBack ? 1 : 0, {
      stiffness: 750,
      damping: 75,
    });
  }, [progress, showBack]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-20, 0]),
      },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [0, 8]),
      },
    ],
  }));

  const handleBackPress = async () => {
    await Haptics.selectionAsync();
    onBack?.();
  };

  const handleClosePress = async () => {
    await Haptics.selectionAsync();
    onClose();
  };

  return (
    <Tray.HeaderRow>
        <View style={{ width: 44, alignItems: "flex-start" }}>
          <Animated.View style={backStyle}>
            {showBack ? (
              <Tray.HeaderCloseButton
                onPress={handleBackPress}
              >
                <SymbolView
                  name="chevron.left"
                  type="palette"
                  size={TRAY_HEADER_CLOSE_ICON_SIZE}
                  weight="semibold"
                  tintColor="#787878"
                />
              </Tray.HeaderCloseButton>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
            },
            titleStyle,
          ]}
        >
          {typeof leftLabel === "string" ? (
          <Text className="font-medium" style={trayDemoText.Title1}>
            {leftLabel}
          </Text>
          ) : (
            leftLabel
          )}
        </Animated.View>

        <View style={{ width: 44, alignItems: "flex-end" }}>
          {shouldClose ? (
            <Tray.HeaderCloseButton
              onPress={handleClosePress}
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={TRAY_HEADER_CLOSE_ICON_SIZE}
                weight="semibold"
                tintColor="#787878"
              />
            </Tray.HeaderCloseButton>
          ) : null}
        </View>
    </Tray.HeaderRow>
  );
}
