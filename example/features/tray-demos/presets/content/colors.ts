const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

// keep legacy tokens isolated so newer tray demos can ignore them
export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
  grey: {
    100: "#F7F7F7",
    200: "#F0F2F4",
    300: "#94999F",
  },
  red: {
    100: "#FEE6E4",
    300: "#FD0C1C",
  },
};
