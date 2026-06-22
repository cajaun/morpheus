import React from "react";
import {
  Platform,
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  TRAY_ITEM_GAP,
  TRAY_SECTION_PADDING_BOTTOM,
  TRAY_SECTION_PADDING_TOP,
} from "../core/constants";
import { useTrayStepOptions } from "../runtime/tray-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type TraySectionProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number | `${number}%`;
  maxHeightRatio?: number;

  style?: StyleProp<ViewStyle>;
  className?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentClassName?: string;
};

// section height accepts several authoring styles but collapses to one layout unit
const resolveHeight = (
  maxHeight?: number | `${number}%`,
  maxHeightRatio?: number,
) => {
  // explicit ratios win because they capture tray intent across device sizes
  if (typeof maxHeightRatio === "number") {
    return SCREEN_HEIGHT * maxHeightRatio;
  }

  // fallback input supports ratios pixels and percent strings for convenience
  if (maxHeight !== undefined) {
    if (typeof maxHeight === "number") {
      // values at or below one are interpreted as normalized screen ratios
      if (maxHeight <= 1) return SCREEN_HEIGHT * maxHeight;

      // larger numbers are treated as explicit pixel caps
      return maxHeight;
    }

    if (typeof maxHeight === "string" && maxHeight.endsWith("%")) {
      const percent = parseFloat(maxHeight) / 100;
      return SCREEN_HEIGHT * percent;
    }
  }

  // default stops short of fullscreen so headers and footers still breathe
  return SCREEN_HEIGHT * 0.70;
};

// one primitive covers static and scrollable sections to keep step markup uniform
export const TraySection: React.FC<TraySectionProps> = ({
  children,
  scrollable = false,

  maxHeight,
  maxHeightRatio,

  style,
  className,
  contentContainerStyle,
  contentClassName,
}) => {
  const height = resolveHeight(maxHeight, maxHeightRatio);
  const { hasFooter } = useTrayStepOptions();

  if (scrollable) {
    return (
      <View style={[{ height }, style]} className={className}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            hasFooter && styles.footerAwareSection,
            contentContainerStyle,
          ]}
          className={contentClassName}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          scrollEventThrottle={16}
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.section,
        hasFooter && styles.footerAwareSection,
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: TRAY_ITEM_GAP,
    paddingTop: TRAY_SECTION_PADDING_TOP,
    paddingBottom: TRAY_SECTION_PADDING_BOTTOM,
  },
  footerAwareSection: {
    // The footer owns the complete 16pt content-to-button gap. Avoid stacking
    // the section's ordinary 24pt terminal padding in front of it.
    paddingBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: TRAY_ITEM_GAP,
    paddingTop: TRAY_SECTION_PADDING_TOP,
    paddingBottom: TRAY_SECTION_PADDING_BOTTOM,
    flexGrow: 1,
  },
});

TraySection.displayName = "TraySection";
