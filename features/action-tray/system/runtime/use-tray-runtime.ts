import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import {
  resolveTrayStepOptions,
  type TrayHostActionsValue,
  type TrayHostStateValue,
  type TrayRegistration,
} from "./tray-context";

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

type Params = {
  keyboardHeight: SharedValue<number>;
  anticipateKeyboard: () => void;
  dismissFocusedInputs: (trayId?: string | null) => void;
  registerFocusable: TrayHostActionsValue["registerFocusable"];
};

export const useTrayRuntime = ({
  keyboardHeight,
  anticipateKeyboard,
  dismissFocusedInputs,
  registerFocusable,
}: Params) => {
  const [registry, setRegistry] = useState<Record<string, TrayRegistration>>({});
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTrayIdRef = useRef<string | null>(null);
  const totalRef = useRef(0);
  const justOpenedRef = useRef(false);

  const registerTray = useCallback(
    (id: string, registration: TrayRegistration) => {
      setRegistry((current) => {
        if (current[id] === registration) {
          return current;
        }

        return {
          ...current,
          [id]: registration,
        };
      });
    },
    [],
  );

  const unregisterTray = useCallback((id: string) => {
    setRegistry((current) => {
      if (!(id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });

    if (activeTrayIdRef.current === id) {
      setActiveTrayId(null);
      setActiveIndex(0);
    }
  }, []);

  const activeTray = activeTrayId ? registry[activeTrayId] : undefined;
  const total = activeTray?.steps.length ?? 0;
  const safeIndex = clampIndex(activeIndex, total);
  const activeStep = activeTray?.steps[safeIndex];
  const activeStepOptions = resolveTrayStepOptions(activeStep?.options);

  useEffect(() => {
    activeTrayIdRef.current = activeTrayId;
  }, [activeTrayId]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (activeTrayId && !(activeTrayId in registry)) {
      setActiveTrayId(null);
      setActiveIndex(0);
    }
  }, [activeTrayId, registry]);

  useEffect(() => {
    if (safeIndex !== activeIndex) {
      setActiveIndex(safeIndex);
    }
  }, [activeIndex, safeIndex]);

  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  const openTray = useCallback(
    (id: string) => {
      dismissFocusedInputs(activeTrayId);
      justOpenedRef.current = true;
      totalRef.current = registry[id]?.steps.length ?? 0;
      setActiveIndex(0);
      setActiveTrayId(id);
    },
    [activeTrayId, dismissFocusedInputs, registry],
  );

  const closeActiveTray = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setActiveTrayId(null);
    setActiveIndex(0);
  }, [activeTrayId, dismissFocusedInputs]);

  const requestCloseActiveTray = useCallback(() => {
    dismissFocusedInputs(activeTrayId);

    if (
      activeStepOptions.fullScreen &&
      activeStepOptions.fullScreenCloseBehavior === "returnToShell" &&
      safeIndex > 0
    ) {
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    setActiveTrayId(null);
    setActiveIndex(0);
  }, [activeStepOptions, activeTrayId, dismissFocusedInputs, safeIndex]);

  const nextStep = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setActiveIndex((current) => {
      if (totalRef.current <= 0) {
        return 0;
      }

      return Math.min(current + 1, totalRef.current - 1);
    });
  }, [activeTrayId, dismissFocusedInputs]);

  const previousStep = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setActiveIndex((current) => Math.max(current - 1, 0));
  }, [activeTrayId, dismissFocusedInputs]);

  const state = useMemo<TrayHostStateValue>(
    () => ({
      registry,
      activeTrayId,
      activeIndex,
      keyboardHeight,
    }),
    [activeIndex, activeTrayId, keyboardHeight, registry],
  );

  const actions = useMemo<TrayHostActionsValue>(
    () => ({
      registerTray,
      unregisterTray,
      openTray,
      closeActiveTray,
      requestCloseActiveTray,
      nextStep,
      previousStep,
      anticipateKeyboard,
      dismissKeyboardForTray: dismissFocusedInputs,
      registerFocusable,
    }),
    [
      anticipateKeyboard,
      closeActiveTray,
      dismissFocusedInputs,
      nextStep,
      openTray,
      previousStep,
      registerFocusable,
      registerTray,
      requestCloseActiveTray,
      unregisterTray,
    ],
  );

  return {
    state,
    actions,
    justOpenedRef,
  };
};
