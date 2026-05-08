import React, { useState } from "react";
import { View } from "react-native";
import type { UsageVariant } from "../component-presentation/types";
import { useTrayDemoTheme } from "../theme";
import { SearchAnimationProvider } from "./animation/search-animation-provider";
import { AnimatedBlur } from "./effects/animated-blur";
import { AnimatedChevron } from "./effects/animated-chevron";
import { FloatingSearchHeader } from "./header/floating-search-header";
import { HeaderActionsPlaceholder } from "./header/header-actions-placeholder";
import { DemoOverview } from "./surfaces/demo-overview";
import { DemoResultsList } from "./surfaces/demo-results-list";

type TrayDemoSearchHomeProps = {
  data: UsageVariant[];
};

export const TrayDemoSearchHome = ({ data }: TrayDemoSearchHomeProps) => {
  const [query, setQuery] = useState("");
  const theme = useTrayDemoTheme();

  return (
    <SearchAnimationProvider>
      <View style={{ backgroundColor: theme.background, flex: 1 }}>
        <DemoOverview />
        <HeaderActionsPlaceholder />
        <AnimatedBlur />
        <DemoResultsList data={data} query={query} />
        <AnimatedChevron />
        <FloatingSearchHeader query={query} setQuery={setQuery} />
      </View>
    </SearchAnimationProvider>
  );
};
