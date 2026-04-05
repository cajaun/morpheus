import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { TextInput } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { ActionTray } from "@/components/action-tray/core/action-tray";
import { useActionTrayKeyboard } from "@/components/action-tray/core/use-action-tray-keyboard";
import { log } from "@/components/action-tray/core/logger";
import { TrayContext, TrayDefinition } from "./context";
import { TrayTransitionDirection } from "../page-transition-context";

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
  const transitionDirectionRef = useRef<TrayTransitionDirection>(0);
  const transitionDirectionShared = useSharedValue<TrayTransitionDirection>(0);
  const fullScreenSlideActiveShared = useSharedValue(false);
  const previousActiveStepRef = useRef<{
    trayId: string | null;
    index: number;
    isFullScreen: boolean;
  }>({
    trayId: null,
    index: 0,
    isFullScreen: false,
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
      transitionDirectionRef.current = 0;
      transitionDirectionShared.value = 0;
      fullScreenSlideActiveShared.value = false;
      setIndex(0);
      setActiveTrayId(id);
    },
    [
      activeTrayId,
      dismissFocusedInputs,
      fullScreenSlideActiveShared,
      transitionDirectionShared,
    ],
  );

  const close = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    transitionDirectionRef.current = 0;
    transitionDirectionShared.value = 0;
    fullScreenSlideActiveShared.value = false;
    setActiveTrayId(null);
    setIndex(0);
  }, [
    activeTrayId,
    dismissFocusedInputs,
    fullScreenSlideActiveShared,
    transitionDirectionShared,
  ]);

  const activeTray = activeTrayId ? registry[activeTrayId] : undefined;
  const total = activeTray?.contents.length ?? 0;

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  const safeIndex = total > 0 ? Math.max(0, Math.min(index, total - 1)) : 0;

  const isFullScreenSlideStep = useCallback(
    (stepIndex: number) => {
      if (!activeTray) {
        return false;
      }

      const element = activeTray.contents[stepIndex]?.();
      if (!element) {
        return false;
      }

      return (
        element.props?.fullScreen === true &&
        (element.props?.fullScreenTransition ?? "morph") === "slide"
      );
    },
    [activeTray],
  );

  const next = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    const nextIndex = Math.min(safeIndex + 1, totalRef.current - 1);
    transitionDirectionRef.current = 1;
    transitionDirectionShared.value = 1;
    fullScreenSlideActiveShared.value =
      isFullScreenSlideStep(safeIndex) && isFullScreenSlideStep(nextIndex);
    setIndex(nextIndex);
  }, [
    activeTrayId,
    dismissFocusedInputs,
    fullScreenSlideActiveShared,
    isFullScreenSlideStep,
    safeIndex,
    transitionDirectionShared,
  ]);

  const back = useCallback(() => {
    dismissFocusedInputs(activeTrayId);
    const nextIndex = Math.max(safeIndex - 1, 0);
    transitionDirectionRef.current = -1;
    transitionDirectionShared.value = -1;
    fullScreenSlideActiveShared.value =
      isFullScreenSlideStep(safeIndex) && isFullScreenSlideStep(nextIndex);
    setIndex(nextIndex);
  }, [
    activeTrayId,
    dismissFocusedInputs,
    fullScreenSlideActiveShared,
    isFullScreenSlideStep,
    safeIndex,
    transitionDirectionShared,
  ]);

  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  useEffect(() => {
    const nextActiveStep = {
      trayId: activeTrayId,
      index: safeIndex,
      isFullScreen: activeTray?.contents[safeIndex]?.()?.props?.fullScreen === true,
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
        previousFullScreen: previousActiveStep.isFullScreen,
        nextFullScreen: nextActiveStep.isFullScreen,
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
      anticipateKeyboard,
      registerTray,
      registerFocusable,
      dismissKeyboard: () => dismissFocusedInputs(activeTrayId),
      transitionDirection: transitionDirectionRef.current,
    }),
    [
      activeTrayId,
      back,
      close,
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
        const isFullScreenDraggable =
          contentEl?.props?.fullScreenDraggable !== false;
        const fullScreenTransition =
          contentEl?.props?.fullScreenTransition ?? "morph";
        const containerStyle = contentEl?.props?.style ?? undefined;
        const containerClassName = contentEl?.props?.className;

        const footerEl = isActive && def.footer ? def.footer() : null;
        const footerStyle = footerEl?.props?.style;
        const footerClassName = footerEl?.props?.className;

        const isFirstRender = justOpenedRef.current && trayIndex === 0;
        const previousStepMeta = previousActiveStepRef.current;
        const fullScreenSlideEnabled =
          isActive &&
          isFullScreen &&
          fullScreenTransition === "slide" &&
          previousStepMeta.trayId === trayId &&
          previousStepMeta.isFullScreen === true &&
          !isFirstRender;

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
              fullScreenDraggable: isFullScreenDraggable,
              fullScreenTransition,
              transitionDirection: transitionDirectionRef.current,
              fullScreenSlideEnabled,
              transitionDirectionShared,
              fullScreenSlideActiveShared,
              step: trayIndex,
              total: trayTotal,
            })
          : null;

        if (isActive) {
          log("PROVIDER CONTENT FLAGS", {
            trayId,
            trayIndex,
            isFirstRender,
            fullScreenSlideEnabled,
            transitionDirection: transitionDirectionRef.current,
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
