import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import * as Haptics from "expo-haptics";

type TitleWeight =
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "black";

const weightClassMap: Record<TitleWeight, string> = {
  thin: "font-sfThin",
  light: "font-sfLight",
  regular: "font-sfRegular",
  medium: "font-sfMedium",
  semibold: "font-sfSemibold",
  bold: "font-sfBold",
  black: "font-sfBlack",
};

export default function Header({
  step = 0,
  onClose,
  onBack,
  leftLabel,
  shouldClose,
  titleWeight = "medium",
}: {
  step: number;
  onClose: () => void;
  onBack?: () => void;
  leftLabel?: React.ReactNode | string;
  shouldClose?: boolean;
  titleWeight?: TitleWeight;
}) {
  const isBackMode = !!onBack && step > 0;

  const handlePress = async () => {
    await Haptics.selectionAsync();

    if (isBackMode) {
      onBack?.();
    } else {
      onClose();
    }
  };

  return (
    <View
      style={{
        justifyContent: "center",
      }}
    >
      <View>
        {typeof leftLabel === "string" ? (
          <Text
            className={weightClassMap[titleWeight]}
            style={{ fontSize: 24, lineHeight: 34, letterSpacing: 0.3 }}
          >
            {leftLabel}
          </Text>
        ) : (
          leftLabel
        )}
      </View>

      {shouldClose && (
        <PressableScale
          onPress={handlePress}
          className="rounded-full bg-[#F5F5FA] items-center justify-center"
          style={{
            position: "absolute",
            right: 0,
            height: 32,
            width: 32,
          }}
        >
          <SymbolView
            name="xmark"
            type="palette"
            size={16}
            weight="bold"
            tintColor={"#949595"}
          />
        </PressableScale>
      )}
    </View>
  );
}