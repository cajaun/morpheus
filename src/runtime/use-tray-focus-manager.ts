import { useCallback, useRef } from "react";

// track focusable inputs per tray so dismissal clears the active field of that tray
export const useTrayFocusManager = (
  dismissKeyboard: () => void | Promise<void>,
) => {
  const focusableRegistryRef = useRef<Record<string, Set<React.RefObject<any>>>>(
    {},
  );

  const registerFocusable = useCallback(
    (trayId: string, ref: React.RefObject<any>) => {
      // each tray owns its ref set so sibling trays never blur each other
      const refs = focusableRegistryRef.current[trayId] ?? new Set();
      refs.add(ref);
      focusableRegistryRef.current[trayId] = refs;

      return () => {
        const currentRefs = focusableRegistryRef.current[trayId];

        if (!currentRefs) {
          return;
        }

        currentRefs.delete(ref);

        if (currentRefs.size === 0) {
          delete focusableRegistryRef.current[trayId];
        }
      };
    },
    [],
  );

  const dismissFocusedInputs = useCallback(
    (trayId?: string | null) => {
      if (trayId) {
        const refs = focusableRegistryRef.current[trayId];

        // blur first because some platforms ignore dismiss while focus stays
        refs?.forEach((ref) => {
          const node = ref.current;

          if (node?.isFocused?.()) {
            node.blur?.();
          }
        });
      }

      return dismissKeyboard();
    },
    [dismissKeyboard],
  );

  return {
    registerFocusable,
    dismissFocusedInputs,
  };
};
