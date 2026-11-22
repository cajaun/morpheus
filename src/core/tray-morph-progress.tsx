import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayMorphProgressContext =
  createContext<SharedValue<number> | null>(null);

export const TrayMorphProgressProvider = TrayMorphProgressContext.Provider;

// header primitives also render in isolated previews and tests
export const useOptionalTrayMorphProgress = () =>
  useContext(TrayMorphProgressContext);

// UI-thread progress of the active geometry morph, 0 when layout motion starts and 1 on completion
export const useTrayMorphProgress = () => {
  const progress = useContext(TrayMorphProgressContext);

  if (!progress) {
    throw new Error(
      "useTrayMorphProgress must be used within rendered Tray content",
    );
  }

  return progress;
};
