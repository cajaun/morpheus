import React from "react";
import type { SharedValue } from "react-native-reanimated";

// the content region reports a commit and its payload's generation, the sheet records it for the boundary clock and can measure in the same commit
export const TrayContentCommitContext = React.createContext<
  ((generation?: number) => void) | null
>(null);

// where the shell records the generation of the last committed content, the fullscreen-to-sheet clock waits on it
export type TrayContentCommitTarget = {
  committedGeneration: SharedValue<number>;
  // used when a commit cannot name its own generation
  shellGenerationRef: { current: number };
  // called when content commits at the same height, so the shell decides on a stand-in layout participant
  commitWithoutResizeRef?: { current: ((generation: number) => void) | null };
};

export const TrayContentCommitTargetContext =
  React.createContext<TrayContentCommitTarget | null>(null);
