import { SymbolView } from "expo-symbols";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTrayDemoTheme } from "../../theme";
import {
  SEARCHBAR_RESULTS_WIDTH,
  EDIT_HOME_CONTAINER_WIDTH,
  SEARCHBAR_OVERVIEW_WIDTH,
  SEARCHBAR_HEIGHT,
  TRIGGER_DRAG_DISTANCE,
  useSearchAnimation,
} from "../animation/search-animation-provider";

type SearchbarProps = {
  query: string;
  setQuery: (query: string) => void;
};

export const Searchbar = ({ query, setQuery }: SearchbarProps) => {
  const theme = useTrayDemoTheme();
  const {
    inputRef,
    isListDragging,
    offsetY,
    onOpenResults,
    screenView,
  } = useSearchAnimation();

  const containerStyle = useAnimatedStyle(() => {
    if (
      isListDragging.value &&
      offsetY.value < 0 &&
      offsetY.value < TRIGGER_DRAG_DISTANCE
    ) {
      return {
        transformOrigin: "center",
        transform: [{ scale: withTiming(1.05) }],
      };
    }

    return {
      width: withSpring(
        screenView.value === "overview"
          ? SEARCHBAR_OVERVIEW_WIDTH
          : SEARCHBAR_RESULTS_WIDTH,
        {
          damping: 100,
          stiffness: 1400,
        },
      ),
      marginLeft: withTiming(
        screenView.value === "overview" ? EDIT_HOME_CONTAINER_WIDTH : 0,
      ),
      transform: [{ scale: withTiming(1) }],
      transformOrigin: isListDragging.value ? "center" : "left",
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        placeholder="Search tray demos"
        placeholderTextColor={theme.muted}
        selectionColor={theme.foreground}
        style={[
          styles.input,
          {
            backgroundColor: theme.searchBackground,
            color: theme.foreground,
          },
        ]}
        onPressIn={onOpenResults}
      />
      <View style={styles.icon}>
        <SymbolView
          name="magnifyingglass"
          tintColor={theme.muted}
          size={16}
          weight="semibold"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    zIndex: 999,
  },
  icon: {
    left: 14,
    position: "absolute",
  },
  input: {
    borderCurve: "continuous",
    borderRadius: 18,
    fontFamily: "Sf-medium",
    fontSize: 16,
    height: SEARCHBAR_HEIGHT,
    paddingLeft: 42,
    paddingRight: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
});
