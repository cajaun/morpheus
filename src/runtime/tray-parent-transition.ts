import { createContext, useCallback, useContext, useState } from "react";
import {
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// the transition a parent's step content mounted in, generation 0 means nothing to wait for
export type TrayParentTransition = {
  generation: number;
  completedGeneration: SharedValue<number>;
};

export const TrayParentTransitionContext =
  createContext<TrayParentTransition | null>(null);

export const TrayParentTransitionProvider =
  TrayParentTransitionContext.Provider;

// true once the parent's transition completes, settles once and stays settled
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

// the parent's latest completed transition generation as React state
export const useParentCompletedGeneration = () => {
  const parentTransition = useContext(TrayParentTransitionContext);
  const completedGeneration = parentTransition?.completedGeneration;
  const [completed, setCompleted] = useState(0);

  useAnimatedReaction(
    () => completedGeneration?.value ?? 0,
    (value, previous) => {
      if (value !== previous) {
        scheduleOnRN(setCompleted, value);
      }
    },
    [completedGeneration],
  );

  return completed;
};
