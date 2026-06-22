import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayFlow, useTrayPages } from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { TRAY_ITEM_RADIUS } from "@/features/action-tray/system/core/constants";

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
        justifyContent: "flex-start",
        gap: 14,
        borderRadius: TRAY_ITEM_RADIUS,
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
        <SymbolView name={icon} tintColor="#FFFFFF"  weight="semibold" />
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

export const ExistingWalletHero = () => {
  return (
    <View
      style={{
        height: 128,
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          bottom: 63,
          width: "54%",
          height: 63,
          borderRadius: 18,
          backgroundColor: "#31C94F",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 43,
          width: "62%",
          height: 63,
          borderRadius: 18,
          backgroundColor: "#FFB40B",
        }}
      />
      <View
        style={{
          width: "73%",
          height: 84,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: "#3EADF0",
          paddingHorizontal: 17,
          paddingTop: 17,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            width: 41,
            height: 41,
            borderRadius: 21,
            backgroundColor: "#65C8F4",
          }}
        />
        <View
          style={{
            marginTop: 5,
            width: 103,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#65C8F4",
          }}
        />
      </View>
    </View>
  );
};

export const ExistingWalletOption = ({
  icon,
  iconBackground,
  iconColor = "#FFFFFF",
  iconContent,
  layout = "horizontal",
  title,
  description,
  disabled = false,
}: {
  icon?: SFSymbol;
  iconBackground?: string;
  iconColor?: string;
  iconContent?: React.ReactNode;
  layout?: "horizontal" | "stacked";
  title: string;
  description: string;
  disabled?: boolean;
}) => {
  const isStacked = layout === "stacked";
  const optionStyle = {
    minHeight: isStacked ? 190 : 100,
    flexDirection: isStacked ? ("column" as const) : ("row" as const),
    alignItems: isStacked ? ("flex-start" as const) : ("center" as const),
    gap: isStacked ? 20 : 14,
    borderRadius: TRAY_ITEM_RADIUS,
    backgroundColor: disabled ? "transparent" : trayDemoColors.softSurface,
    borderWidth: disabled ? 1 : 0,
    borderStyle: disabled ? ("dashed" as const) : ("solid" as const),
    borderColor: "#E5E7EA",
    paddingHorizontal: isStacked ? 28 : 20,
    paddingVertical: isStacked ? 20 : 12,
  };
  const content = (
    <>
      {iconContent ?? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: iconBackground,
          }}
        >
          {icon ? (
            <SymbolView
              name={icon}
              tintColor={iconColor}
              size={25}
              weight="semibold"
            />
          ) : null}
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          className="font-sf-semibold"
          style={[
            trayDemoText.bodyLarge,
            { color: disabled ? "#BFC2C6" : "#282828" },
          ]}
        >
          {title}
        </Text>
        <Text
          className="font-sf-medium"
          style={[
            trayDemoText.body,
            { color: disabled ? "#D6D8DB" : "#9FA4AA" },
          ]}
        >
          {description}
        </Text>
      </View>
    </>
  );

  if (disabled) {
    return <View style={optionStyle}>{content}</View>;
  }

  return <PressableScale style={optionStyle}>{content}</PressableScale>;
};

export const FamilyAccountIcon = () => {
  return (
    <View
      style={{
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#FFF5D9",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 17,
          width: 44,
          height: 34,
          borderRadius: 18,
          backgroundColor: "#FFE3A0",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 10,
          width: 25,
          height: 25,
          borderRadius: 13,
          backgroundColor: "#FFE3A0",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 18,
          left: 10,
          width: 25,
          height: 25,
          borderRadius: 13,
          backgroundColor: "#FFE3A0",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 18,
          right: 10,
          width: 25,
          height: 25,
          borderRadius: 13,
          backgroundColor: "#FFE3A0",
        }}
      />
      <SymbolView
        name="face.smiling"
        tintColor="#9DAFC0"
        size={22}
        weight="medium"
        style={{ marginTop: 17 }}
      />
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
