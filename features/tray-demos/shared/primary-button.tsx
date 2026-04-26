import React from "react";
import { Text } from "react-native";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoRadius,
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
    <PressableScale
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: disabled
          ? trayDemoColors.primaryActionDisabled
          : backgroundColor,
        height: 50,
        borderRadius: trayDemoRadius.button,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        borderCurve: "continuous"
      }}
    >
      <Text
        className="font-sf-bold text-white"
        style={trayDemoText.button}
      >
        {label}
      </Text>
    </PressableScale>
  );
};
