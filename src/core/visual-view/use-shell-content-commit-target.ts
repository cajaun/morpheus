import { useMemo, useRef } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { startTrayLayoutWithoutResize } from "../animation/tray-layout";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import { type TrayKeyboardGate } from "../transition-start";
import { type TrayContentCommitTarget } from "../tray-content-commit";

// the content region reports through this target which transition's content is mounted
export const useShellContentCommitTarget = ({
  trayId,
  withoutResizeEnabled,
  transitionGeneration,
  transitionStartedAt,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  morphProgress,
  keyboardGate,
  onLayoutComplete,
}: {
  trayId: string | undefined;
  // a sheet step or page change that uses the native layout transition
  withoutResizeEnabled: boolean;
  transitionGeneration: number;
  transitionStartedAt: SharedValue<number>;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  morphProgress: SharedValue<number>;
  keyboardGate: TrayKeyboardGate | null | undefined;
  onLayoutComplete: (finishedAt: number, generation: number) => void;
}) => {
  // the fullscreen-to-sheet clock waits for the mounted content's generation
  const contentCommittedGeneration = useSharedValue(0);
  const shellGenerationRef = useRef(0);
  shellGenerationRef.current = transitionGeneration;
  const commitWithoutResizeRef = useRef<((generation: number) => void) | null>(
    null,
  );
  const contentCommitTarget = useMemo<TrayContentCommitTarget>(
    () => ({
      committedGeneration: contentCommittedGeneration,
      shellGenerationRef,
      commitWithoutResizeRef,
    }),
    [contentCommittedGeneration],
  );

  // a step at an unchanged height gets no native layout transition, so a stand-in layout participant starts and completes the clock
  commitWithoutResizeRef.current = withoutResizeEnabled
    ? (generation: number) => {
        if (generation !== transitionGeneration) {
          return;
        }

        const started = startTrayLayoutWithoutResize({
          transitionGeneration: generation,
          transitionStartedAt,
          transitionStartedGeneration,
          transitionLayoutStartedGeneration,
          transitionCompletedGeneration,
          morphProgress,
          keyboardGate: keyboardGate ?? undefined,
          onComplete: onLayoutComplete,
        });

        if (started && isTrayDebugLoggingEnabled()) {
          log("LAYOUT WITHOUT RESIZE", { trayId, generation });
        }
      }
    : null;

  return { contentCommittedGeneration, contentCommitTarget };
};
