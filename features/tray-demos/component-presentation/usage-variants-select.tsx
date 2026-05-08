import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import React, { useEffect } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { EdgeBlur } from "../search/effects/edge-blur";
import { useTrayDemoTheme } from "../theme";
import type { UsageVariant } from "./types";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 160, stiffness: 1600 };

type UsageVariantsSelectProps = {
  data: UsageVariant[];
  listRef: React.RefObject<FlatList<UsageVariant> | null>;
  listIndexOffset?: number;
  open: boolean;
  setVariant: (variant: UsageVariant) => void;
  setOpen: (open: boolean) => void;
  variant: UsageVariant;
};

type AnimatedOptionRowProps = {
  closedOriginOffset: number;
  containerHeight: SharedValue<number>;
  index: number;
  isOpen: SharedValue<boolean>;
  item: UsageVariant;
  numberOfRows: number;
  onSelect: (variant: UsageVariant) => void;
  selected: boolean;
};

const AnimatedOptionRow = ({
  closedOriginOffset,
  containerHeight,
  index,
  isOpen,
  item,
  numberOfRows,
  onSelect,
  selected,
}: AnimatedOptionRowProps) => {
  const theme = useTrayDemoTheme();
  const rowStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(isOpen.value ? 0 : -20, SPRING_CONFIG),
      },
      {
        translateY: withSpring(
          isOpen.value
            ? 0
            : containerHeight.value -
                index * (containerHeight.value / numberOfRows) +
                closedOriginOffset,
          SPRING_CONFIG,
        ),
      },
    ],
  }));

  const selectedChromeStyle = useAnimatedStyle(
    () => ({
      opacity: selected
        ? withTiming(isOpen.value ? 1 : 0, { duration: 220 })
        : 0,
    }),
    [selected],
  );

  return (
    <Animated.View
      style={[
        rowStyle,
        selected ? styles.selectedOptionFrame : styles.optionFrame,
      ]}
    >
      <Pressable
        onPress={() => onSelect(item)}
        style={[
          styles.option,
          selected && styles.selectedOptionPressable,
        ]}
      >
        {selected ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.selectedOptionBackground,
              { backgroundColor: theme.selectedRowBackground },
              selectedChromeStyle,
            ]}
          />
        ) : null}
        <Text
          className="font-sf-semibold"
          numberOfLines={1}
          style={[styles.optionLabel, { color: theme.foreground }]}
        >
          {item.label}
        </Text>
        {selected ? (
          <Animated.View
            style={[
              styles.selectedIndicator,
              { backgroundColor: theme.selectionCheckBackground },
              selectedChromeStyle,
            ]}
          >
            <SymbolView
              name="checkmark"
              tintColor={theme.selectionCheckForeground}
              size={12}
              weight="bold"
            />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export const UsageVariantsSelect = ({
  data,
  listIndexOffset = 0,
  listRef,
  open,
  setVariant,
  setOpen,
  variant,
}: UsageVariantsSelectProps) => {
  const insets = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const { height } = useWindowDimensions();
  const isOpen = useSharedValue(false);
  const containerHeight = useSharedValue(0);
  const closedOriginOffset = Math.max(0, height - insets.top - 120);

  useEffect(() => {
    isOpen.value = open;
  }, [isOpen, open]);

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: Platform.OS === "ios" ? withTiming(isOpen.value ? 32 : 0) : 0,
  }));

  const androidBackdropStyle = useAnimatedStyle(() => {
    if (Platform.OS !== "android") {
      return { opacity: 0 };
    }

    return {
      opacity: withTiming(isOpen.value ? 1 : 0),
    };
  });

  const optionsContainerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen.value ? 1 : 0),
  }));

  const selectVariant = (nextVariant: UsageVariant) => {
    setVariant(nextVariant);
    listRef.current?.scrollToIndex({
      animated: false,
      index: data.indexOf(nextVariant) + listIndexOffset,
    });
    setOpen(false);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => setOpen(false)}
      transparent
      visible={open}
    >
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === "ios" ? (
          <AnimatedBlurView
            animatedProps={blurAnimatedProps}
            tint={theme.fullScreenBlurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <AnimatedPressable
            onPress={() => setOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.androidVeil },
              androidBackdropStyle,
            ]}
          />
        )}

        <Pressable
          accessibilityLabel="Close tray example selector backdrop"
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        />

        <Animated.ScrollView
          contentContainerStyle={{
            gap: 6,
            paddingBottom: insets.bottom + 112,
            paddingHorizontal: 16,
            paddingTop: insets.top + 120,
          }}
          pointerEvents="box-none"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            onLayout={(event) => {
              containerHeight.value = event.nativeEvent.layout.height;
            }}
            style={[styles.optionsContainer, optionsContainerStyle]}
          >
            {data.map((item, index) => {
              const selected = item.value === variant.value;

              return (
                <AnimatedOptionRow
                  key={item.value}
                  closedOriginOffset={closedOriginOffset}
                  containerHeight={containerHeight}
                  index={index}
                  isOpen={isOpen}
                  item={item}
                  numberOfRows={data.length}
                  onSelect={selectVariant}
                  selected={selected}
                />
              );
            })}
          </Animated.View>
        </Animated.ScrollView>

        <EdgeBlur edge="top" height={insets.top + 92} />
        <EdgeBlur edge="bottom" height={insets.bottom + 100} />

        <Pressable
          accessibilityLabel="Close tray example selector"
          onPress={() => setOpen(false)}
          style={[
            styles.closeButton,
            {
              backgroundColor: theme.foreground,
              bottom: insets.bottom + 24,
            },
          ]}
        >
          <SymbolView
            name="xmark"
            tintColor={theme.background}
            size={24}
            weight="regular"
          />
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    transform: [{ translateX: -24 }],
    width: 48,
  },
  option: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  optionFrame: {
    alignSelf: "flex-start",
  },
  optionLabel: {
    fontSize: 18,
  },
  optionsContainer: {
    gap: 6,
  },
  selectedIndicator: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  selectedOptionBackground: {
    borderCurve: "continuous",
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  selectedOptionFrame: {
    alignSelf: "stretch",
  },
  selectedOptionPressable: {
    alignSelf: "stretch",
    width: "100%",
  },
});
