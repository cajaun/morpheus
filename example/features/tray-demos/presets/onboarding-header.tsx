import React from "react";
import { Text } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Tray } from "react-native-morpheus";
import { trayDemoText } from "@/shared/theme/tokens";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";

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

  const handleBackPress = async () => {
    await Haptics.selectionAsync();
    onBack?.();
  };

  const handleClosePress = async () => {
    await Haptics.selectionAsync();
    onClose();
  };

  const left = showBack ? (
    <Tray.HeaderButton onPress={handleBackPress}>
      <SymbolView
        name="chevron.left"
        type="palette"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
        tintColor="#787878"
      />
    </Tray.HeaderButton>
  ) : undefined;

  const right = shouldClose ? (
    <Tray.HeaderButton onPress={handleClosePress}>
      <SymbolView
        name="xmark"
        type="palette"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
        tintColor="#787878"
      />
    </Tray.HeaderButton>
  ) : undefined;

  return (
    <Tray.HeaderRow left={left} right={right}>
      {typeof leftLabel === "string" ? (
        <Text className="font-medium" style={trayDemoText.Title1}>
          {leftLabel}
        </Text>
      ) : (
        leftLabel
      )}
    </Tray.HeaderRow>
  );
}
