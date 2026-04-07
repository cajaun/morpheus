import React from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";

export const WalletActionRow = ({
  icon,
  iconColor,
  label,
  description,
  onPress,
}: {
  icon: SFSymbol;
  iconColor: string;
  label: string;
  description: string;
  onPress?: () => void;
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

export const CreateNewHeader = ({ onClose }: { onClose: () => void }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 8,
      }}
    >
      <PressableScale onPress={onClose} style={{ width: 32, alignItems: "flex-start" }}>
        <SymbolView
          name="xmark"
          type="palette"
          size={22}
          weight="semibold"
          tintColor="#2A2A2C"
        />
      </PressableScale>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flex: 1,
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={{
              width: 24,
              height: 4,
              borderRadius: 999,
              backgroundColor: index === 0 ? trayDemoColors.primaryAction : "#D8DADF",
            }}
          />
        ))}
      </View>

      <PressableScale
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#DCDDDF",
        }}
      >
        <SymbolView
          name="questionmark"
          type="palette"
          size={16}
          weight="semibold"
          tintColor="#5D6167"
        />
      </PressableScale>
    </View>
  );
};
