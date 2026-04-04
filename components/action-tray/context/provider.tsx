import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { ActionTray } from "@/components/action-tray/core/action-tray";
import { useActionTrayKeyboard } from "@/components/action-tray/core/use-action-tray-keyboard";
import { log } from "@/components/action-tray/core/logger";
import { TrayContext, TrayDefinition } from "./context";

export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [registry, setRegistry] = useState<Record<string, TrayDefinition>>({});
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const { keyboardHeight, dismissKeyboard } = useActionTrayKeyboard();

  const totalRef = useRef(0);
  const focusableRegistryRef = useRef<Record<string, Set<React.RefObject<any>>>>(
    {},
  );
  const justOpenedRef = useRef(false);
  const previousActiveStepRef = useRef<{
    trayId: string | null;
    index: number;
  }>({
    trayId: null,
    index: 0,
  });

  const registerTray = useCallback((id: string, def: TrayDefinition) => {
    setRegistry((prev) => ({ ...prev, [id]: def }));
  }, []);

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

  const registerFocusable = useCallback(
    (trayId: string | null, ref: React.RefObject<any>) => {
      if (!trayId) {
        return () => {};
      }

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

  const openTray = useCallback(
    (id: string) => {
      dismissFocusedInputs(activeTrayId);
      justOpenedRef.current = true;
      setIndex(0);
      setActiveTrayId(id);
    },
    [activeTrayId, dismissFocusedInputs],
  );

  const close = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setActiveTrayId(null);
    setIndex(0);
  }, [activeTrayId, dismissFocusedInputs]);

  const activeTray = activeTrayId ? registry[activeTrayId] : undefined;
  const total = activeTray?.contents.length ?? 0;

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  const safeIndex = total > 0 ? Math.max(0, Math.min(index, total - 1)) : 0;

  const next = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setIndex((i) => Math.min(i + 1, totalRef.current - 1));
  }, [activeTrayId, dismissFocusedInputs]);

  const back = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setIndex((i) => Math.max(i - 1, 0));
  }, [activeTrayId, dismissFocusedInputs]);

  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  useEffect(() => {
    const nextActiveStep = {
      trayId: activeTrayId,
      index: safeIndex,
    };
    const previousActiveStep = previousActiveStepRef.current;

    const didChange =
      previousActiveStep.trayId !== nextActiveStep.trayId ||
      previousActiveStep.index !== nextActiveStep.index;

    if (didChange) {
      log("PROVIDER STEP CHANGE", {
        from: previousActiveStep,
        to: nextActiveStep,
        total,
        sameTray: previousActiveStep.trayId === nextActiveStep.trayId,
      });
    }

    previousActiveStepRef.current = nextActiveStep;
  }, [activeTrayId, safeIndex, total]);

  const ctxValue = useMemo(
    () => ({
      activeTrayId,
      openTray,
      close,
      next,
      back,
      index: safeIndex,
      total,
      registerTray,
      registerFocusable,
      dismissKeyboard: () => dismissFocusedInputs(activeTrayId),
    }),
    [
      activeTrayId,
      back,
      close,
      dismissFocusedInputs,
      next,
      openTray,
      registerFocusable,
      registerTray,
      safeIndex,
      total,
    ],
  );

  return (
    <TrayContext.Provider value={ctxValue}>
      {children}

      {/* Render one ActionTray per registered tray — all at root level so
          position: absolute resolves against the screen, not a child container. */}
      {Object.entries(registry).map(([trayId, def]) => {
        const isActive = activeTrayId === trayId;
        const trayTotal = def.contents.length;
        const trayIndex = isActive
          ? Math.max(0, Math.min(safeIndex, trayTotal - 1))
          : 0;

        const contentEl = def.contents[trayIndex]?.();
        const isFullScreen = contentEl?.props?.fullScreen === true;
        const containerStyle = contentEl?.props?.style ?? undefined;
        const containerClassName = contentEl?.props?.className;

        const footerEl = isActive && def.footer ? def.footer() : null;
        const footerStyle = footerEl?.props?.style;
        const footerClassName = footerEl?.props?.className;

        const isFirstRender = justOpenedRef.current && trayIndex === 0;

        const rawContent = isActive
          ? React.cloneElement(contentEl, {
              stepKey: `${trayId}-${trayIndex}`,
              // The shell owns container visuals now. Reapplying them on the
              // animated inner wrapper creates a second independently-sized box.
              className: undefined,
              style: undefined,
              skipEntering: isFirstRender,
              skipExiting: false,
              fullScreen: isFullScreen,
              step: trayIndex,
              total: trayTotal,
            })
          : null;

        if (isActive) {
          log("PROVIDER CONTENT FLAGS", {
            trayId,
            trayIndex,
            isFirstRender,
          });
        }

        const footer = footerEl
          ? React.cloneElement(footerEl, {
              fullScreen: isFullScreen,
              step: trayIndex,
              total: trayTotal,
            })
          : null;

        return (
          <ActionTray
            key={trayId}
            visible={isActive}
            content={rawContent}
            footer={footer}
            onClose={close}
            trayId={isActive ? `${trayId}-${trayIndex}` : undefined}
            fullScreen={isFullScreen}
            containerStyle={containerStyle}
            className={containerClassName}
            footerStyle={footerStyle}
            footerClassName={footerClassName}
            keyboardHeight={keyboardHeight}
            dismissKeyboard={() => dismissFocusedInputs(activeTrayId)}
          />
        );
      })}
    </TrayContext.Provider>
  );
};
