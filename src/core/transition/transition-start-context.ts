import { createContext, useContext } from "react";
import { type SharedValue } from "react-native-reanimated";

export type TrayTransitionStart = {
  generation: number;
  fullScreenChanged: boolean;
  // true when a shell layout participant opens the content barrier, so content never waits for a layout native never scheduled
  layoutStartRequired?: boolean;
  generationValue: SharedValue<number>;
  fullScreenChangedValue: SharedValue<number>;
  morphProgress?: SharedValue<number>;
  startedAt: SharedValue<number>;
  startedGeneration: SharedValue<number>;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  // policy captured with the transition so keyboard handoffs never race a late shared-value update
  keyboardStepTransition?: boolean;
};

export type TrayTransitionParticipant = "incoming" | "outgoing" | "layout";

// startedAt is the shared clock start and joinedAt the participant's first frame, both on the UI frame clock
export type TrayTransitionStartSignal = (
  startedAt: number,
  generation: number,
  joinedAt: number,
) => void;

export const TrayTransitionStartContext =
  createContext<TrayTransitionStart | null>(null);

export const TrayTransitionStartProvider = TrayTransitionStartContext.Provider;

// the transition clock shared by shell and content participants
export const useTrayTransitionStart = () =>
  useContext(TrayTransitionStartContext);

// the newest generation across render and UI-thread state
export const resolveTrayTransitionGeneration = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  // the descriptor leads until the shared generation catches up
  if (descriptorGeneration <= 0) {
    return 0;
  }

  return Math.max(
    descriptorGeneration,
    transitionStart?.generationValue.value ?? 0,
  );
};

// fullscreen change from the descriptor until shared state catches up
export const resolveTrayTransitionFullScreenChanged = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  if (descriptorGeneration <= 0) {
    return false;
  }

  const sharedGeneration = transitionStart?.generationValue.value ?? 0;
  const sharedFullScreenChanged =
    transitionStart?.fullScreenChangedValue.value ?? 0;

  // descriptor fullscreen state until the shared generation advances
  return (
    (sharedGeneration > descriptorGeneration
      ? sharedFullScreenChanged
      : transitionStart?.fullScreenChanged
        ? 1
        : 0) > 0
  );
};

// content waits for the shell when the transition has a shell participant, a descriptor alone proves no native animation
export const shouldWaitForTrayLayoutStart = (
  transitionStart: TrayTransitionStart | null,
  generation: number,
) => {
  "worklet";

  return transitionStart?.layoutStartRequired === true && generation > 0;
};
