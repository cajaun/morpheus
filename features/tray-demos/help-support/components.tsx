import React from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";

export const HelpCard = ({
  label,
  description,
  icon,
  iconColor,
  onPress,
}: {
  label: string;
  description: string;
  icon: SFSymbol;
  iconColor: string;
  onPress: () => void;
}) => {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 24,
        backgroundColor: trayDemoColors.softSurface,
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconColor,
        }}
      >
        <SymbolView name={icon} tintColor="#FFFFFF" size={22} weight="bold" />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          className="font-sf-semibold text-[#282828]"
          style={trayDemoText.bodyLarge}
        >
          {label}
        </Text>

        <Text className="font-sf-medium text-[#9FA4AA]" style={trayDemoText.body}>
          {description}
        </Text>
      </View>
    </PressableScale>
  );
};

export const AreaRow = ({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: SFSymbol;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 18,
        backgroundColor: selected ? trayDemoColors.softSurface : "transparent",
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <SymbolView name={icon} tintColor="#B0B0B0" size={22} weight="medium" />
        <Text
          className="font-sf-medium text-[#2C2C2C]"
          style={trayDemoText.bodyLarge}
        >
          {label}
        </Text>
      </View>

      {selected ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: trayDemoColors.primaryAction,
          }}
        >
          <SymbolView
            name="checkmark"
            tintColor="#FFFFFF"
            size={14}
            weight="bold"
          />
        </View>
      ) : null}
    </PressableScale>
  );
};
