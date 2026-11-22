import React from "react";
import { type TrayVisualViewProps } from "./visual-view/props";
import { TrayVisualViewBody } from "./visual-view/view-body";
import { TrayKeyboardCapableVisualView } from "./visual-view/keyboard-capable-view";

const TrayVisualView = React.memo((props: TrayVisualViewProps) =>
  props.keyboardStickyCapable === false ? (
    <TrayVisualViewBody {...props} keyboardStickyEnabled={false} />
  ) : (
    <TrayKeyboardCapableVisualView {...props} />
  ),
);

TrayVisualView.displayName = "TrayVisualView";

export { TrayVisualView };
