import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
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
  const showBack = step > 0;

  // Proper shared value animation
  const progress = useSharedValue(showBack ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(showBack ? 1 : 0, {
      stiffness: 750,
      damping: 75,
    });
  }, [showBack]);

  // Back button animation
  const rBackStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-20, 0]),
      },
    ],
  }));

  // Title slight shift for polish (optional)
  const rTitleStyle = useAnimatedStyle(() => ({
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
    <View style={{     paddingVertical: 12,
    justifyContent: "center", }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* LEFT SLOT (Back Button Space Reserved Always) */}
        <View style={{ width: 44, alignItems: "flex-start" }}>
          <Animated.View style={rBackStyle}>
            {showBack && (
              <PressableScale
                onPress={handleBackPress}
                className="p-3 rounded-full bg-[#F5F5FA]"
              >
                <SymbolView
                  name="chevron.left"
                  type="palette"
                  size={18}
                  weight="semibold"
                  tintColor={"#94999F"}
                />
              </PressableScale>
            )}
          </Animated.View>
        </View>

        {/* CENTER TITLE */}
        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
            },
            rTitleStyle,
          ]}
        >
          {typeof leftLabel === "string" ? (
            <Text className="text-2xl font-sfMedium">
              {leftLabel}
            </Text>
          ) : (
            leftLabel
          )}
        </Animated.View>

        {/* RIGHT SLOT (Close Button Space Reserved Always) */}
        <View style={{ width: 44, alignItems: "flex-end" }}>
          {shouldClose && (
            <PressableScale
              onPress={handleClosePress}
              className="p-3 rounded-full bg-[#F5F5FA]"
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={18}
                weight="semibold"
                tintColor={"#94999F"}
              />
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
}