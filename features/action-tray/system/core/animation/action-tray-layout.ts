import { Easing, LinearTransition } from "react-native-reanimated";
import { MORPH_DURATION } from "../constants";

// layout timing matches content timing so shell and content read as one morph
export const createTrayLayoutTransition = () => {
  const heightEasing = Easing.bezier(0.26, 1, 0.5, 1).factory();
  return LinearTransition.duration(MORPH_DURATION).easing(heightEasing);
};
