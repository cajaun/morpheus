import React from "react";
import { Text } from "react-native";
import { Tray } from "react-native-morpheus";
import {
  trayDemoColors,
  trayDemoText,
} from "@/shared/theme/tokens";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  backgroundColor?: string;
};

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  backgroundColor = trayDemoColors.primaryAction,
}) => {
  return (
    <Tray.PrimaryButton
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: disabled
          ? trayDemoColors.primaryActionDisabled
          : backgroundColor,
      }}
    >
      <Text
        className="font-bold text-white "
        style={trayDemoText.Button}
      >
        {label}
      </Text>
    </Tray.PrimaryButton>
  );
};
