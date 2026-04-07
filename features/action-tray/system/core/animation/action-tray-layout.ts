import { Easing, LinearTransition } from "react-native-reanimated";
import { MORPH_DURATION } from "../constants";

export const createTrayLayoutTransition = () => {
  const heightEasing = Easing.bezier(0.26, 1, 0.5, 1).factory();
  return LinearTransition.duration(MORPH_DURATION).easing(heightEasing);
};
