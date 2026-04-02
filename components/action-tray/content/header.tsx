import React from "react";
import { Text, View, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import * as Haptics from "expo-haptics";

export default function Header({
  step = 0,
  onClose,
  onBack,
  leftLabel,
  shouldClose,
}: {
  step: number;
  onClose: () => void;
  onBack?: () => void;
  leftLabel?: React.ReactNode | string;
  shouldClose?: boolean;
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
    <View >
      <View
        style={{
          paddingVertical: 28,
          justifyContent: "center",
        }}
      >
        <View>
          {typeof leftLabel === "string" ? (
            <Text className="font-sfMedium" style={{ fontSize: 24, lineHeight: 34, letterSpacing: 0.3 }}>
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
              weight="semibold"
              tintColor={"#94999F"}
            />
          </PressableScale>
        )}
      </View>
    </View>
  );
}
