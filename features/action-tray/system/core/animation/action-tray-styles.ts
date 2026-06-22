import { StyleSheet } from "react-native";
import {
  TRAY_FOOTER_PADDING_BOTTOM,
  TRAY_FOOTER_PADDING_TOP,
  TRAY_VERTICAL_PADDING,
} from "../constants";

// static styles stay separate so motion code only reasons about changing values
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
    paddingTop: TRAY_FOOTER_PADDING_TOP,
    paddingBottom: TRAY_FOOTER_PADDING_BOTTOM,
    borderCurve: "continuous",
  },
  measureFooter: {
    position: "absolute",
    opacity: 0,
    top: -10000,
  },
});
