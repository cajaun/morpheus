import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayMorphProgressContext =
  createContext<SharedValue<number> | null>(null);

export const TrayMorphProgressProvider = TrayMorphProgressContext.Provider;

/**
 * Returns the UI-thread progress of the active tray geometry morph.
 * The value resets to 0 when layout motion starts and reaches 1 on completion.
 */
export const useTrayMorphProgress = () => {
  const progress = useContext(TrayMorphProgressContext);

  if (!progress) {
    throw new Error(
      "useTrayMorphProgress must be used within rendered Tray content",
    );
  }

  return progress;
};
