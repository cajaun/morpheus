import { StyleSheet } from "react-native";
import { TRAY_VERTICAL_PADDING } from "./constants";

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    borderCurve: "continuous",
    overflow: "hidden",
  },
  content: {
    padding: 0,
  },
  footer: {
    position: "absolute",
    paddingHorizontal: TRAY_VERTICAL_PADDING,
    paddingTop: 6,
    paddingBottom: TRAY_VERTICAL_PADDING,
      borderCurve: "continuous",
  },
  measureFooter: {
    position: "absolute",
    opacity: 0,
    top: -10000,
  },
});
