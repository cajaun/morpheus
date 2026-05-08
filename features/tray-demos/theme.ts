import { useColorScheme } from "react-native";

const lightTheme = {
  androidVeil: "rgba(245, 245, 245, 0.94)",
  background: "#F5F5F5",
  fullScreenBlurTint: "systemUltraThinMaterialLight" as const,
  foreground: "#151515",
  icon: "#6F737C",
  muted: "#8B8F98",
  pressHighlight: "rgba(21, 21, 21, 0.06)",
  searchBackground: "rgba(255, 255, 255, 0.88)",
  selectedRowBackground: "#FFFFFF",
  selectionCheckBackground: "#151515",
  selectionCheckForeground: "#F5F5F5",
  skeleton: "rgba(21, 21, 21, 0.08)",
  skeletonStrong: "rgba(21, 21, 21, 0.1)",
  veilMid: "rgba(245, 245, 245, 0.84)",
  veilSolid: "rgba(245, 245, 245, 1)",
  veilTransparent: "rgba(245, 245, 245, 0)",
};

const darkTheme = {
  androidVeil: "rgba(17, 17, 19, 0.94)",
  background: "#111113",
  fullScreenBlurTint: "systemUltraThinMaterialDark" as const,
  foreground: "#F5F5F5",
  icon: "#A7ABB3",
  muted: "#9CA0A8",
  pressHighlight: "rgba(255, 255, 255, 0.08)",
  searchBackground: "rgba(35, 35, 38, 0.88)",
  selectedRowBackground: "rgba(35, 35, 38, 0.94)",
  selectionCheckBackground: "#F5F5F5",
  selectionCheckForeground: "#111113",
  skeleton: "rgba(245, 245, 245, 0.1)",
  skeletonStrong: "rgba(245, 245, 245, 0.14)",
  veilMid: "rgba(17, 17, 19, 0.84)",
  veilSolid: "rgba(17, 17, 19, 1)",
  veilTransparent: "rgba(17, 17, 19, 0)",
};

export const useTrayDemoTheme = () => {
  const colorScheme = useColorScheme();

  return colorScheme === "dark" ? darkTheme : lightTheme;
};
