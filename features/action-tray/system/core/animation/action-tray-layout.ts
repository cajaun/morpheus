import {
  Easing,
  LinearTransition,
  runOnJS,
} from "react-native-reanimated";
import { MORPH_DURATION } from "../constants";

export const createTrayLayoutTransition = (
  onComplete?: (finishedAt: number) => void,
) => {
  const transition = LinearTransition
    .duration(MORPH_DURATION)
    .easing(Easing.bezier(0.34, 1.12, 0.64, 1).factory());

  if (!onComplete) {
    return transition;
  }

  return transition.withCallback((finished) => {
    "worklet";

    if (finished) {
      runOnJS(onComplete)(performance.now());
    }
  });
};
