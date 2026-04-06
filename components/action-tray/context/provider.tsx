import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { TextInput } from "react-native";
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

  const { keyboardHeight, dismissKeyboard, anticipateKeyboard } =
    useActionTrayKeyboard();

  const totalRef = useRef(0);
  const focusableRegistryRef = useRef<Record<string, Set<React.RefObject<any>>>>(
    {},
  );
  const justOpenedRef = useRef(false);

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
  const activeContentProps = activeTray?.contents[safeIndex]?.()?.props;
  const activeFullScreen = activeContentProps?.fullScreen === true;
  const activeFullScreenCloseBehavior =
    activeContentProps?.fullScreenCloseBehavior ?? "dismiss";

  const next = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setIndex((current) => Math.min(current + 1, totalRef.current - 1));
  }, [activeTrayId, dismissFocusedInputs]);

  const back = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    setIndex((current) => Math.max(current - 1, 0));
  }, [activeTrayId, dismissFocusedInputs]);

  const requestClose = useCallback(() => {
    dismissFocusedInputs(activeTrayId);

    if (
      activeFullScreen &&
      activeFullScreenCloseBehavior === "returnToShell" &&
      safeIndex > 0
    ) {
      setIndex((current) => Math.max(current - 1, 0));
      return;
    }

    setActiveTrayId(null);
    setIndex(0);
  }, [
    activeFullScreen,
    activeFullScreenCloseBehavior,
    activeTrayId,
    dismissFocusedInputs,
    safeIndex,
  ]);

  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  const ctxValue = useMemo(
    () => ({
      activeTrayId,
      openTray,
      close,
      requestClose,
      next,
      back,
      index: safeIndex,
      total,
      anticipateKeyboard,
      registerTray,
      registerFocusable,
      dismissKeyboard: () => dismissFocusedInputs(activeTrayId),
    }),
    [
      activeTrayId,
      back,
      close,
      requestClose,
      dismissFocusedInputs,
      next,
      openTray,
      anticipateKeyboard,
      registerFocusable,
      registerTray,
      safeIndex,
      total,
    ],
  );

  return (
    <TrayContext.Provider value={ctxValue}>
      <TextInput
        editable={false}
        pointerEvents="none"
        showSoftInputOnFocus={false}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          top: -1000,
          left: -1000,
        }}
      />

      {children}


      {Object.entries(registry).map(([trayId, def]) => {
        const isActive = activeTrayId === trayId;
        const trayTotal = def.contents.length;
        const trayIndex = isActive
          ? Math.max(0, Math.min(safeIndex, trayTotal - 1))
          : 0;

        const contentEl = def.contents[trayIndex]?.();
        const isFullScreen = contentEl?.props?.fullScreen === true;
        const isFullScreenDraggable =
          contentEl?.props?.fullScreenDraggable !== false;
        const containerStyle = contentEl?.props?.style ?? undefined;
        const containerClassName = contentEl?.props?.className;

        const footerEl = isActive && def.footer ? def.footer() : null;
        const footerStyle = footerEl?.props?.style;
        const footerClassName = footerEl?.props?.className;

        const isFirstRender = justOpenedRef.current && trayIndex === 0;

        const rawContent = isActive
          ? React.cloneElement(contentEl, {
              stepKey: `${trayId}-${trayIndex}`,

              className: undefined,
              style: undefined,
              skipEntering: isFirstRender,
              skipExiting: false,
              fullScreen: isFullScreen,
              fullScreenDraggable: isFullScreenDraggable,
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
            onClose={requestClose}
            trayId={isActive ? `${trayId}-${trayIndex}` : undefined}
            fullScreen={isFullScreen}
            fullScreenDraggable={isFullScreenDraggable}
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
