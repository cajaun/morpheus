import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Tray } from "react-native-morpheus";
import { trayDemoText } from "@/shared/theme/tokens";
import {
  TRAY_HEADER_CLOSE_ICON_SIZE,
} from "react-native-morpheus/constants";

type TitleWeight =
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "black";

const weightClassMap: Record<TitleWeight, string> = {
  thin: "font-thin",
  light: "font-light",
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  black: "font-black",
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
  // the leading control changes role but the shell api stays the same
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
    <Tray.HeaderRow>
      <View>
        {typeof leftLabel === "string" ? (
          <Text className={weightClassMap[titleWeight]} style={trayDemoText.Title1}>
            {leftLabel}
          </Text>
        ) : (
          leftLabel
        )}
      </View>

      {shouldClose ? (
        <Tray.HeaderCloseButton
          onPress={handlePress}
        >
          <SymbolView
            name={"xmark"}
            type="palette"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            weight="bold"
            tintColor="#787878"
          />
        </Tray.HeaderCloseButton>
      ) : null}
    </Tray.HeaderRow>
  );
}
