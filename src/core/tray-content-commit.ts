import React from "react";
import type { SharedValue } from "react-native-reanimated";

// Lets the content region tell the animated sheet that new step content has
// committed, and which transition generation that content belongs to (the
// generation of the payload the region rendered, not the shell's latest
// one). The sheet records it for the boundary clock and, when synchronous
// measurement is enabled, measures the content in the same commit.
export const TrayContentCommitContext = React.createContext<
  ((generation?: number) => void) | null
>(null);

// Where the shell records the generation of the last committed step content.
// The fullscreen-to-sheet clock waits on it so incoming content mounts before
// the shell starts moving. Stable for the shell's lifetime.
export type TrayContentCommitTarget = {
  committedGeneration: SharedValue<number>;
  // used when a commit cannot name its own generation (raw node content)
  shellGenerationRef: { current: number };
};

export const TrayContentCommitTargetContext =
  React.createContext<TrayContentCommitTarget | null>(null);
