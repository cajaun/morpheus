import { SymbolView } from "expo-symbols";
import React, {
  FC,
  useState,
  useRef,
  createContext,
  useContext,
  PropsWithChildren,
} from "react";
import { View, TextInput, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/* =========================
   CONSTANTS
========================= */
const SEARCHBAR_HEIGHT = 33;
const CANCEL_CONTAINER_WIDTH = 75;
const LEFT_PADDING = 16;
const COMPACT_SIDE_BUTTONS_WIDTH = 100;

const SEARCHBAR_END_WIDTH =
  Dimensions.get("window").width - COMPACT_SIDE_BUTTONS_WIDTH;

const SEARCHBAR_INITIAL_WIDTH =
  Dimensions.get("window").width - CANCEL_CONTAINER_WIDTH - LEFT_PADDING;

/* =========================
   CONTEXT (internal)
========================= */
type ContextValue = {
  inputRef: React.RefObject<TextInput>;
  searchbarWidth: Animated.SharedValue<number>;
};

const AnimationContext = createContext<ContextValue | null>(null);

const useHomeAnimation = () => {
  const ctx = useContext(AnimationContext);
  if (!ctx) throw new Error("Must be used inside provider");
  return ctx;
};

/* =========================
   CANCEL BUTTON
========================= */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CancelButton: FC = () => {
  const { searchbarWidth, inputRef } = useHomeAnimation();

  const handlePress = () => {
    inputRef.current?.clear();
    inputRef.current?.blur();

    searchbarWidth.value = withTiming(SEARCHBAR_INITIAL_WIDTH, {
      duration: 250,
    });
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.cancel}>
      <Text style={styles.cancelText}>Cancel</Text>
    </AnimatedPressable>
  );
};

/* =========================
   SEARCHBAR
========================= */
type SearchbarProps = {
  query: string;
  setQuery: (value: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ query, setQuery }) => {
  const { inputRef, searchbarWidth } = useHomeAnimation();
  const [isFocused, setIsFocused] = useState(false);

  const rContainerStyle = useAnimatedStyle(() => ({
    width: searchbarWidth.value,
  }));

  const rCancelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
  }));

  const handleFocus = () => {
    setIsFocused(true);
    searchbarWidth.value = withTiming(SEARCHBAR_END_WIDTH, { duration: 250 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    searchbarWidth.value = withTiming(SEARCHBAR_INITIAL_WIDTH, {
      duration: 250,
    });
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", zIndex: 999 }}>
      <Animated.View style={[rContainerStyle, { justifyContent: "center" }]}>
        <TextInput
          ref={inputRef}
          placeholder="Search"
          placeholderTextColor="#78716c"
          style={{
            height: SEARCHBAR_HEIGHT,
            backgroundColor: "#E3E2EA",
            borderRadius: 12,
            paddingLeft: 40,
            paddingRight: 12,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.icon}>
          <SymbolView name="magnifyingglass" size={16} tintColor="#78716c" />
        </View>
      </Animated.View>

      <Animated.View style={rCancelStyle}>
        <CancelButton />
      </Animated.View>
    </View>
  );
};

/* =========================
   PROVIDER WRAPPER
========================= */
export const SearchbarProvider: FC<PropsWithChildren> = ({ children }) => {
  const inputRef = useRef<TextInput>(null);
  const searchbarWidth = useSharedValue(SEARCHBAR_INITIAL_WIDTH);

  return (
    <AnimationContext.Provider value={{ inputRef, searchbarWidth }}>
      {children}
    </AnimationContext.Provider>
  );
};

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  cancel: {
    width: CANCEL_CONTAINER_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    color: "#a3a3a3",
    fontWeight: "500",
  },
  icon: {
    position: "absolute",
    left: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});