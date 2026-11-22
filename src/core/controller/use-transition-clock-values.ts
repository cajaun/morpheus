import { useSharedValue } from "react-native-reanimated";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import type { TrayTransitionContract } from "../../runtime/types";

// shared values of the transition clock every participant syncs on
export const useTransitionClockValues = (
  transitionContract: TrayTransitionContract | null | undefined,
) => {
  const transitionStartedGeneration = useSharedValue(0);
  const transitionStartedAt = useSharedValue(0);
  const transitionLayoutStartedGeneration = useSharedValue(0);
  const transitionCompletedGeneration = useSharedValue(0);
  const transitionGenerationValue = useSharedValue(
    transitionContract?.generation ?? 0,
  );
  const fullScreenChangedValue = useSharedValue(
    transitionContract?.fullScreenChanged ? 1 : 0,
  );
  const morphProgress = useSharedValue(1);

  useProfiledTrayLayoutEffect(
    "useTrayController.syncTransitionValues",
    () => {
      // exiting content reads the current transition descriptor
      transitionGenerationValue.value = transitionContract?.generation ?? 0;
      fullScreenChangedValue.value = transitionContract?.fullScreenChanged
        ? 1
        : 0;
    },
    [
      fullScreenChangedValue,
      transitionContract?.fullScreenChanged,
      transitionContract?.generation,
      transitionGenerationValue,
    ],
  );

  return {
    transitionStartedGeneration,
    transitionStartedAt,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
    transitionGenerationValue,
    fullScreenChangedValue,
    morphProgress,
  };
};
