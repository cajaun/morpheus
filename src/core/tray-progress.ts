import { useTrayMorphProgress } from "./tray-morph-progress";
import { useTrayOriginProgress } from "./tray-origin-progress";

// group the two tray-shell progress values without pretending they are one
// animation clock; page progress remains owned by useTrayPages
export const useTrayProgress = () => ({
  morph: useTrayMorphProgress(),
  origin: useTrayOriginProgress(),
});
