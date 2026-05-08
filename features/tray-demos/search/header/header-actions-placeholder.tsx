import React from "react";
import { Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTrayDemoTheme } from "../../theme";
import {
  EDIT_HOME_CONTAINER_WIDTH,
  SEARCHBAR_HEIGHT,
  SETTINGS_CONTAINER_WIDTH,
} from "../animation/search-animation-provider";
import { useSearchHeaderHeight } from "./use-search-header-height";

export const HeaderActionsPlaceholder = () => {
  const theme = useTrayDemoTheme();
  const { insetTop } = useSearchHeaderHeight();

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "center",
        flexDirection: "row",
        height: SEARCHBAR_HEIGHT,
        left: 0,
        paddingHorizontal: 24,
        position: "absolute",
        right: 0,
        top: insetTop + 12,
      }}
    >
      <Pressable
        style={{
          alignItems: "center",
          height: SEARCHBAR_HEIGHT,
          justifyContent: "center",
          width: EDIT_HOME_CONTAINER_WIDTH,
        }}
      >
        <SymbolView
          name="slider.horizontal.3"
          tintColor={theme.icon}
          size={22}
          weight="semibold"
        />
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable
        style={{
          alignItems: "center",
          height: SEARCHBAR_HEIGHT,
          justifyContent: "center",
          width: SETTINGS_CONTAINER_WIDTH,
        }}
      >
        <SymbolView
          name="ellipsis"
          tintColor={theme.icon}
          size={22}
          weight="bold"
        />
      </Pressable>
    </View>
  );
};
