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

  // one progress value keeps the back slot and title movement phase aligned
  const progress = useSharedValue(showBack ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(showBack ? 1 : 0, {
      stiffness: 750,
      damping: 75,
    });
  }, [showBack]);

  // back motion is small because the tray shell is already animating
  const rBackStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-20, 0]),
      },
    ],
  }));

  // the title shifts to preserve optical centering when the back slot appears
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
        {/* reserve the left slot even when empty so title centering stays stable */}
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

        {/* title centering should not depend on which side controls are visible */}
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

        {/* reserve the close slot too so the header width math never changes */}
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
