import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayFlow, useTrayPages } from "@/features/action-tray";
import { AnimatedFlowButton } from "@/features/action-tray/presets/animated-flow-button";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoText } from "@/shared/theme/tokens";
import { DOT_SIZE } from "./constants";
import type { SendAction } from "./types";

export const ActionRow = ({
  icon,
  iconBackgroundColor,
  label,
  description,
  onPress,
}: {
  icon: SFSymbol;
  iconBackgroundColor: string;
  label: string;
  description: string;
  onPress?: () => void;
}) => {
  return (
    <PressableScale
      className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4"
      onPress={onPress}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          backgroundColor: iconBackgroundColor,
        }}
      >
        <SymbolView name={icon} tintColor="#fff" weight="bold" />
      </View>

      <View className="flex-1">
        <Text className="font-sf-medium text-white" style={trayDemoText.bodyLarge}>
          {label}
        </Text>

        <Text
          className="text-[#94999F] font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          {description}
        </Text>
      </View>
    </PressableScale>
  );
};

const FullScreenActionHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className="text-white font-sf-bold"
        style={{
          fontSize: 32,
          lineHeight: 40,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>

      <PressableScale onPress={onClose}>
        <SymbolView name="xmark" tintColor="#fff" size={30} weight="regular" />
      </PressableScale>
    </View>
  );
};

const ProgressDot = ({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) => {
  const isActive = useDerivedValue(() => {
    const distance = Math.abs(progress.value - index);
    return Math.max(1 - distance, 0);
  });

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isActive.value, [0, 1], [0.3, 1]),
    transform: [{ scale: interpolate(isActive.value, [0, 1], [1, 1.3]) }],
  }));

  return (
    <Animated.View
      className="rounded-full bg-white"
      style={[{ width: DOT_SIZE, height: DOT_SIZE }, dotStyle]}
    />
  );
};

const FlowProgressDots = () => {
  const { totalPages, progress } = useTrayPages();

  const dotIndexes = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index),
    [totalPages],
  );

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ gap: 8, paddingBottom: 14 }}
    >
      {dotIndexes.map((index) => (
        <ProgressDot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
};

export const SendFlowHeader = ({ action }: { action: SendAction }) => {
  const { requestClose } = useTrayFlow();
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: top + 20,
        paddingBottom: 24,
      }}
    >
      <FullScreenActionHeader
        title={action === "swap" ? "Swap" : "Send"}
        onClose={requestClose}
      />
    </View>
  );
};

export const SendFlowFooter = () => {
  const { close } = useTrayFlow();
  const { pageIndex, totalPages, nextPage, backPage } = useTrayPages();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="items-center"
      style={{
        paddingBottom: bottom + 25,
      }}
    >
      <FlowProgressDots />

      <AnimatedFlowButton
        step={pageIndex}
        totalSteps={totalPages}
        onNext={nextPage}
        onSecondaryPress={backPage}
        onFinish={close}
      />
    </View>
  );
};
