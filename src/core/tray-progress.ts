import { useTrayMorphProgress } from "./tray-morph-progress";
import { useTrayOriginProgress } from "./tray-origin-progress";

// the two tray-shell progress values, which run on separate clocks, page progress belongs to useTrayPages
export const useTrayProgress = () => ({
  morph: useTrayMorphProgress(),
  origin: useTrayOriginProgress(),
});
