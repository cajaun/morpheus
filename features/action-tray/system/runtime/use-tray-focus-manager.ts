import { useCallback, useRef } from "react";

export const useTrayFocusManager = (dismissKeyboard: () => void) => {
  const focusableRegistryRef = useRef<Record<string, Set<React.RefObject<any>>>>(
    {},
  );

  const registerFocusable = useCallback(
    (trayId: string, ref: React.RefObject<any>) => {
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

        refs?.forEach((ref) => {
          const node = ref.current;

          if (node?.isFocused?.()) {
            node.blur?.();
          }
        });
      }

      dismissKeyboard();
    },
    [dismissKeyboard],
  );

  return {
    registerFocusable,
    dismissFocusedInputs,
  };
};
