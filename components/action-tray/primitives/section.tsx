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
import { TRAY_SECTION_GAP } from "../core/constants";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type TraySectionProps = {
  children: React.ReactNode;
  scrollable?: boolean;

  /** Flexible height controls */
  maxHeight?: number | `${number}%`; // 400 | 0.75 | "75%"
  maxHeightRatio?: number; // cleaner API: 0 → 1

  style?: StyleProp<ViewStyle>;
  className?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentClassName?: string;
};

/**
 * Resolves maxHeight into pixel value
 */
const resolveHeight = (
  maxHeight?: number | `${number}%`,
  maxHeightRatio?: number,
) => {
  // Priority 1: ratio (clean API)
  if (typeof maxHeightRatio === "number") {
    return SCREEN_HEIGHT * maxHeightRatio;
  }

  // Priority 2: maxHeight
  if (maxHeight !== undefined) {
    if (typeof maxHeight === "number") {
      // <= 1 → treat as ratio
      if (maxHeight <= 1) return SCREEN_HEIGHT * maxHeight;

      // otherwise px
      return maxHeight;
    }

    if (typeof maxHeight === "string" && maxHeight.endsWith("%")) {
      const percent = parseFloat(maxHeight) / 100;
      return SCREEN_HEIGHT * percent;
    }
  }

  // Default
  return SCREEN_HEIGHT * 0.70;
};

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

  if (scrollable) {
    return (
      <View style={[{ height }, style]} className={className}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
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
    <View style={[styles.section, style]} className={className}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: TRAY_SECTION_GAP,
    paddingVertical: TRAY_SECTION_GAP,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: TRAY_SECTION_GAP,
    paddingTop: TRAY_SECTION_GAP,
    paddingBottom: TRAY_SECTION_GAP,
    flexGrow: 1,
  },
});

TraySection.displayName = "TraySection";