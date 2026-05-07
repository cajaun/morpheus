import * as Haptics from "expo-haptics";
import React, { memo, useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaginationIndicator } from "./pagination-indicator";
import type { UsageVariant } from "./types";
import { UsageVariantsSelect } from "./usage-variants-select";

type UsageVariantFlatListProps = {
  data: UsageVariant[];
  scrollEnabled?: boolean;
};

type VariantItemProps = {
  height: number;
  index: number;
  item: UsageVariant;
  itemHeight: number;
  scrollY: SharedValue<number>;
  width: number;
};

const VariantItem = memo(
  ({ height, index, item, itemHeight, scrollY, width }: VariantItemProps) => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        scrollY.value / itemHeight,
        [index - 0.5, index, index + 0.5],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            scrollY.value / itemHeight,
            [index - 0.5, index, index + 0.5],
            [0.9, 1, 0.9],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }));

    return (
      <Animated.View style={[{ height, width }, animatedStyle]}>
        {item.content}
      </Animated.View>
    );
  },
);

VariantItem.displayName = "VariantItem";

export const UsageVariantFlatList = ({
  data,
  scrollEnabled = true,
}: UsageVariantFlatListProps) => {
  const [currentVariant, setCurrentVariant] = useState<UsageVariant>(data[0]!);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<UsageVariant>>(null);
  const scrollY = useSharedValue(0);
  const itemHeight = height;

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: UsageVariant }> }) => {
      if (!viewableItems[0]) {
        return;
      }

      if (Platform.OS === "ios") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setCurrentVariant(viewableItems[0].item);
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const openSelector = useCallback(() => {
    if (data.length === 1) {
      return;
    }

    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectorOpen(true);
  }, [data.length]);

  return (
    <>
      <Animated.FlatList
        ref={listRef}
        data={data}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: itemHeight,
          offset: itemHeight * index,
        })}
        keyExtractor={(item) => item.value}
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        onViewableItemsChanged={handleViewableItemsChanged}
        pagingEnabled
        renderItem={({ item, index }) => (
          <VariantItem
            height={height}
            index={index}
            item={item}
            itemHeight={itemHeight}
            scrollY={scrollY}
            width={width}
          />
        )}
        scrollEnabled={scrollEnabled}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        viewabilityConfig={viewabilityConfig}
      />

      <Pressable
        accessibilityLabel="Select tray example"
        disabled={data.length === 1}
        hitSlop={12}
        onPress={openSelector}
        style={[
          styles.pagination,
          {
            bottom: insets.bottom + 34,
          },
        ]}
      >
        <View style={{ gap: 4 }}>
          {data.map((item, index) => (
            <PaginationIndicator
              key={item.value}
              index={index}
              itemSize={height}
              label={item.label}
              scrollY={scrollY}
            />
          ))}
        </View>
      </Pressable>

      <UsageVariantsSelect
        data={data}
        listRef={listRef}
        open={selectorOpen}
        setVariant={setCurrentVariant}
        setOpen={setSelectorOpen}
        variant={currentVariant}
      />
    </>
  );
};

const styles = StyleSheet.create({
  pagination: {
    left: 24,
    position: "absolute",
    right: 88,
  },
});
