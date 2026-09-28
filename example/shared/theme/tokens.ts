import type { TextStyle, ViewStyle } from "react-native";

export const trayDemoColors = {
  triggerBackground: "#F0F2F4",
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
  LargeTitle: {
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  Title1: {
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  Title2: {
    fontSize: 23,
    lineHeight: 28,
  } satisfies TextStyle,
  Title3: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  Headline: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  Subheadline: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  Body: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  Callout: {
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  Footnote: {
    fontSize: 13,
    lineHeight: 14,
    letterSpacing: 0,
  } satisfies TextStyle,
  Caption1: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  } satisfies TextStyle,
  Caption2: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  } satisfies TextStyle,
  Button: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  Status: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: 0.1,
  } satisfies TextStyle,
} as const;

export const trayDemoFieldShellStyle = {
  borderRadius: trayDemoRadius.field,
  backgroundColor: trayDemoColors.fieldBackground,
  paddingHorizontal: 16,
  paddingVertical: 14,
} satisfies ViewStyle;
