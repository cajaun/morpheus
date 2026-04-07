import React from "react";
import { Text } from "react-native";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoRadius,
  trayDemoText,
} from "@/shared/theme/tokens";

export const ExampleTrigger = ({ label }: { label: string }) => {
  return (
    <PressableScale
      style={{
        backgroundColor: trayDemoColors.triggerBackground,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: trayDemoRadius.pill,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-2xl font-sfBold" style={trayDemoText.title}>
        {label}
      </Text>
    </PressableScale>
  );
};
