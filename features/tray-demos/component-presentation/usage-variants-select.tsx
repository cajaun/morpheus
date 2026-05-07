import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import React, { PropsWithChildren, useEffect } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import type { UsageVariant } from "./types";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 160, stiffness: 1600 };
const CLOSED_ORIGIN_EXTRA_OFFSET = 40;

type UsageVariantsSelectProps = {
  data: UsageVariant[];
  listRef: React.RefObject<FlatList<UsageVariant> | null>;
  open: boolean;
  setVariant: (variant: UsageVariant) => void;
  setOpen: (open: boolean) => void;
  variant: UsageVariant;
};

type AnimatedOptionRowProps = PropsWithChildren<{
  containerHeight: SharedValue<number>;
  index: number;
  isOpen: SharedValue<boolean>;
  numberOfRows: number;
}>;

const AnimatedOptionRow = ({
  children,
  containerHeight,
  index,
  isOpen,
  numberOfRows,
}: AnimatedOptionRowProps) => {
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
                CLOSED_ORIGIN_EXTRA_OFFSET,
          SPRING_CONFIG,
        ),
      },
    ],
  }));

  return <Animated.View style={rowStyle}>{children}</Animated.View>;
};

export const UsageVariantsSelect = ({
  data,
  listRef,
  open,
  setVariant,
  setOpen,
  variant,
}: UsageVariantsSelectProps) => {
  const insets = useSafeAreaInsets();
  const isOpen = useSharedValue(false);
  const containerHeight = useSharedValue(0);

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
      index: data.indexOf(nextVariant),
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
            tint="systemUltraThinMaterialLight"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <AnimatedPressable
            onPress={() => setOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(245, 245, 245, 0.96)" },
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
                  containerHeight={containerHeight}
                  index={index}
                  isOpen={isOpen}
                  numberOfRows={data.length}
                >
                  <Pressable
                    onPress={() => selectVariant(item)}
                    style={[
                      styles.option,
                      selected && styles.selectedOption,
                    ]}
                  >
                    <Text
                      className="font-sf-semibold"
                      numberOfLines={1}
                      style={styles.optionLabel}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <View style={styles.selectedIndicator}>
                        <SymbolView
                          name="checkmark"
                          tintColor="#FFFFFF"
                          size={12}
                          weight="bold"
                        />
                      </View>
                    ) : null}
                  </Pressable>
                </AnimatedOptionRow>
              );
            })}
          </Animated.View>
        </Animated.ScrollView>

        <Pressable
          accessibilityLabel="Close tray example selector"
          onPress={() => setOpen(false)}
          style={[
            styles.closeButton,
            {
              bottom: insets.bottom + 24,
            },
          ]}
        >
          <SymbolView
            name="xmark"
            tintColor="#FFFFFF"
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
    backgroundColor: "#151515",
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
    alignSelf: "flex-start",
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  optionLabel: {
    color: "#151515",
    fontSize: 18,
  },
  optionsContainer: {
    gap: 6,
  },
  selectedIndicator: {
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  selectedOption: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
});
