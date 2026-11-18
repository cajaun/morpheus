import { createContext, useCallback, useContext, useState } from "react";
import {
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// The transition a parent tray's step content was mounted in. generation is 0
// when there is nothing to wait for (an open, or a contract without a shell
// participant that completes it).
export type TrayParentTransition = {
  generation: number;
  completedGeneration: SharedValue<number>;
};

export const TrayParentTransitionContext =
  createContext<TrayParentTransition | null>(null);

export const TrayParentTransitionProvider =
  TrayParentTransitionContext.Provider;

// True once the parent's transition has completed. Settles once and stays
// settled. Driven by the transition's own completion (a UI-thread shared
// value), not by timers. Outside a transition it is settled from the start.
export const useParentTransitionSettled = () => {
  const parentTransition = useContext(TrayParentTransitionContext);
  const generation = parentTransition?.generation ?? 0;
  const completedGeneration = parentTransition?.completedGeneration;
  const [settled, setSettled] = useState(
    () => generation <= 0 || completedGeneration === undefined,
  );
  const markSettled = useCallback(() => {
    setSettled(true);
  }, []);

  useAnimatedReaction(
    () =>
      generation <= 0 ||
      completedGeneration === undefined ||
      completedGeneration.value >= generation,
    (done, previous) => {
      if (done && previous !== true) {
        scheduleOnRN(markSettled);
      }
    },
    [completedGeneration, generation, markSettled],
  );

  return settled;
};
