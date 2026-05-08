import React from "react";
import { View } from "react-native";
import { SEARCHBAR_HEIGHT } from "../animation/search-animation-provider";
import { CancelButton } from "./cancel-button";
import { Searchbar } from "./searchbar";
import { useSearchHeaderHeight } from "./use-search-header-height";

type FloatingSearchHeaderProps = {
  query: string;
  setQuery: (query: string) => void;
};

export const FloatingSearchHeader = ({ query, setQuery }: FloatingSearchHeaderProps) => {
  const { insetTop } = useSearchHeaderHeight();

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 0,
        height: SEARCHBAR_HEIGHT,
        left: 0,
        paddingHorizontal: 24,
        pointerEvents: "box-none",
        position: "absolute",
        right: 0,
        top: insetTop + 12,
        zIndex: 999,
      }}
    >
      <Searchbar query={query} setQuery={setQuery} />
      <CancelButton />
    </View>
  );
};
