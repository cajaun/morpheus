import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { PressableScale } from "@/shared/ui/pressable-scale";

type Props = {
  step: number;
  onClose: () => void;
  onBack?: () => void;
  leftLabel?: React.ReactNode | string;
  shouldClose?: boolean;
};

export default function OnboardingHeader({
  step = 0,
  onClose,
  onBack,
  leftLabel,
  shouldClose,
}: Props) {
  const showBack = step > 0;
  // one progress signal keeps header motion coordinated instead of ad hoc
  const progress = useSharedValue(showBack ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(showBack ? 1 : 0, {
      stiffness: 750,
      damping: 75,
    });
  }, [progress, showBack]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-20, 0]),
      },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [0, 8]),
      },
    ],
  }));

  const handleBackPress = async () => {
    await Haptics.selectionAsync();
    onBack?.();
  };

  const handleClosePress = async () => {
    await Haptics.selectionAsync();
    onClose();
  };

  return (
    <View
      style={{
        paddingVertical: 12,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ width: 44, alignItems: "flex-start" }}>
          <Animated.View style={backStyle}>
            {showBack ? (
              <PressableScale
                onPress={handleBackPress}
                className="p-3 rounded-full bg-[#F5F5FA]"
              >
                <SymbolView
                  name="chevron.left"
                  type="palette"
                  size={18}
                  weight="semibold"
                  tintColor="#94999F"
                />
              </PressableScale>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
            },
            titleStyle,
          ]}
        >
          {typeof leftLabel === "string" ? (
            <Text className="text-2xl font-sf-medium">{leftLabel}</Text>
          ) : (
            leftLabel
          )}
        </Animated.View>

        <View style={{ width: 44, alignItems: "flex-end" }}>
          {shouldClose ? (
            <PressableScale
              onPress={handleClosePress}
              className="p-3 rounded-full bg-[#F5F5FA]"
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={18}
                weight="semibold"
                tintColor="#94999F"
              />
            </PressableScale>
          ) : null}
        </View>
      </View>
    </View>
  );
}
