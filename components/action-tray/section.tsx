import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { TRAY_SECTION_GAP } from "./constants";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type TraySectionProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number;
};

export const TraySection: React.FC<TraySectionProps> = ({
  children,
  scrollable = false,
  maxHeight,
}) => {
  const height = maxHeight ?? SCREEN_HEIGHT * 0.65;

  if (scrollable) {
    return (
      <View style={{ height }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true} 
          overScrollMode="always" 
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={styles.section}>{children}</View>;
};

const styles = StyleSheet.create({
  section: {
    gap: TRAY_SECTION_GAP,
    paddingTop: 24,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: TRAY_SECTION_GAP,
    paddingTop: 24,
    paddingBottom: 24,
    flexGrow: 1, // 🔥 important
  },
});

TraySection.displayName = "TraySection";