import type { TextStyle, ViewStyle } from "react-native";

export const trayDemoColors = {
  triggerBackground: "#F5F5FA",
  primaryAction: "#41BBFF",
  primaryActionDisabled: "#BFE7FF",
  fieldBackground: "#F5F5F7",
  softSurface: "#F7F7F8",
  mutedText: "#94999F",
  secondaryText: "#B6BAC2",
  headingText: "#101318",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const trayDemoRadius = {
  pill: 36,
  field: 20,
  card: 24,
  button: 50,
} as const;

export const trayDemoText = {
  title: {
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: 0.3,
  } satisfies TextStyle,
  bodyLarge: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  body: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  button: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: 0.2,
  } satisfies TextStyle,
} as const;

export const trayDemoFieldShellStyle = {
  borderRadius: trayDemoRadius.field,
  backgroundColor: trayDemoColors.fieldBackground,
  paddingHorizontal: 16,
  paddingVertical: 14,
} satisfies ViewStyle;
