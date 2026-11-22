import { StyleSheet } from "react-native";
import { TRAY_HEADER_HORIZONTAL_PADDING } from "../constants";

export const localStyles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: TRAY_HEADER_HORIZONTAL_PADDING,
  },
  stepFooterLayer: {
    position: "absolute",
    top: 0,
    // sides, bottom and bottom corners follow the sheet through stepFooterContainerStyle
    borderCurve: "continuous",
    justifyContent: "flex-end",
    // clip at the sheet's bottom edge and corners
    overflow: "hidden",
    zIndex: 1,
  },
});
