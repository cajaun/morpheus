import { Easing, LinearTransition } from "react-native-reanimated";
import { MORPH_DURATION } from "../constants";

export const createTrayLayoutTransition = () => {
  return LinearTransition
    .duration(MORPH_DURATION)
    .easing(Easing.bezier(0.34, 1.12, 0.64, 1).factory());
};