import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoText } from "@/shared/theme/tokens";

type TitleWeight =
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "black";

const weightClassMap: Record<TitleWeight, string> = {
  thin: "font-sf-thin",
  light: "font-sf-light",
  regular: "font-sf-regular",
  medium: "font-sf-medium",
  semibold: "font-sf-semibold",
  bold: "font-sf-bold",
  black: "font-sf-black",
};

type Props = {
  step?: number;
  onClose: () => void;
  onBack?: () => void;
  leftLabel?: React.ReactNode | string;
  shouldClose?: boolean;
  titleWeight?: TitleWeight;
};

export default function FlowHeader({
  step = 0,
  onClose,
  onBack,
  leftLabel,
  shouldClose,
  titleWeight = "medium",
}: Props) {
  const isBackMode = !!onBack && step > 0;

  const handlePress = async () => {
    await Haptics.selectionAsync();

    if (isBackMode) {
      onBack?.();
      return;
    }

    onClose();
  };

  return (
    <View style={{ justifyContent: "center" }}>
      <View>
        {typeof leftLabel === "string" ? (
          <Text className={weightClassMap[titleWeight]} style={trayDemoText.title}>
            {leftLabel}
          </Text>
        ) : (
          leftLabel
        )}
      </View>

      {shouldClose ? (
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
            name={"xmark"}
            type="palette"
            size={16}
            weight="bold"
            tintColor="#949595"
          />
        </PressableScale>
      ) : null}
    </View>
  );
}
