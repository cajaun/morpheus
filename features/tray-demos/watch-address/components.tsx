import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayFlow, useTrayPages } from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";

export const CREATE_WALLET_COLORS = [
  "#F24160",
  "#E63E9D",
  "#C63AE7",
  "#8B4BE8",
  "#574AE5",
  "#3E7BEF",
  "#459CE6",
  "#49A3F0",
  "#53B4CC",
  "#54BC86",
  "#56C752",
  "#7CCC35",
  "#F2BA2F",
  "#FAA332",
  "#F5772A",
  "#F24343",
  "#D2B24B",
  "#CC8F49",
  "#1E437F",
  "#1E1E1E",
] as const;

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

const CreateWalletProgress = ({ pageIndex }: { pageIndex: number }) => {
  const fillColors = ["#41BBFF", "#41BBFF", "#2A2A2C", "#D7DAE0"];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        flex: 1,
      }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <View
          key={index}
          style={{
            width: 28,
            height: 4,
            borderRadius: 999,
            backgroundColor:
              index === pageIndex ? fillColors[index] : "#DCDDDF",
          }}
        />
      ))}
    </View>
  );
};

export const CreateWalletFlowHeader = () => {
  const { requestClose } = useTrayFlow();
  const { pageIndex, backPage } = useTrayPages();
  const { top } = useSafeAreaInsets();
  const isFirstPage = pageIndex === 0;

  return (
    <View
      style={{
        paddingTop: top + 10,
        paddingHorizontal: 24,
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
          name={"xmark"}
          type="palette"
          size={22}
          weight="semibold"
          tintColor="#2A2A2C"
        />
      </PressableScale>

      <CreateWalletProgress pageIndex={pageIndex} />

      <PressableScale
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name="questionmark.circle"
          type="palette"
          size={32}
   
          tintColor="#2A2A2C"
        />
      </PressableScale>
    </View>
  );
};

export const CreateWalletNameHint = () => {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#E8EAEE",
        borderStyle: "dashed",
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 18,
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E6E8ED",
          marginTop: -26,
        }}
      >
        <View
          style={{
            width: 12,
            height: 4,
            borderRadius: 999,
            backgroundColor: "#7EBEFE",
          }}
        />
      </View>

      <Text
        className="font-sf-medium text-center text-[#A5A9B0]"
        style={{
          fontSize: 16,
          lineHeight: 24,
          letterSpacing: 0.12,
        }}
      >
        Your new address will add to Wallet Group 2.{"\n"}Change group
      </Text>
    </View>
  );
};

export const CreateWalletColorGrid = ({
  selectedColor,
  onSelect,
}: {
  selectedColor: string;
  onSelect: (color: string) => void;
}) => {
  const rows = useMemo(() => {
    const size = 5;
    return Array.from({ length: 4 }, (_, rowIndex) =>
      CREATE_WALLET_COLORS.slice(rowIndex * size, rowIndex * size + size),
    );
  }, []);

  return (
    <View style={{ gap: 16 }}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {row.map((color) => {
            const isSelected = color === selectedColor;

            return (
              <PressableScale
                key={color}
                onPress={() => onSelect(color)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: "#101318",
                }}
              >
                {isSelected ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export const CreateWalletAvatarPicker = ({
  selectedColor,
  selected,
  onPress,
}: {
  selectedColor: string;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        borderWidth: 6,
        borderStyle: "dashed",
        borderColor: selected ? selectedColor : "#EFF0F2",
        backgroundColor: selected ? `${selectedColor}1A` : "transparent",
      }}
    >
      {selected ? (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: selectedColor,
          }}
        />
      ) : (
        <SymbolView
          name="plus"
          tintColor="#E6E7E9"
          size={72}
          weight="semibold"
        />
      )}
    </PressableScale>
  );
};

export const CreateWalletFlowFooter = () => {
  const { pageIndex, totalPages, nextPage } = useTrayPages();
  const { close } = useTrayFlow();
  const { bottom } = useSafeAreaInsets();
  const isLastPage = pageIndex === totalPages - 1;

  return (
    <View
      style={{
        paddingTop: 12,
        paddingHorizontal: 40,
        paddingBottom: bottom,
        gap: 18,
      }}
    >
      <PressableScale
        onPress={isLastPage ? close : nextPage}
        style={{
          height: 50,
          borderRadius: 25,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: trayDemoColors.primaryAction,
        }}
      >
        <Text className="font-sf-semibold text-white" style={trayDemoText.button}>
          Continue
        </Text>
      </PressableScale>
    </View>
  );
};
