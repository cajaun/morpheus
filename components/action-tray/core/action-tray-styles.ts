import { StyleSheet } from "react-native";
import { TRAY_VERTICAL_PADDING } from "./constants";

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    backgroundColor: "white",
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
    backgroundColor: "white",
  },
  measureFooter: {
    position: "absolute",
    opacity: 0,
    top: -10000,
  },
  fullScreenBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
  },
});