import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ActionTray } from "../core/action-tray";
import { TrayStepContent } from "../tray-step-content";
import {
  resolveTrayStepOptions,
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayHostActions,
  useTrayHostSelector,
  useTrayRuntimeStore,
} from "./tray-context";

const clampIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};

type PresentedTray = {
  rootTrayId: string;
  trayId: string;
  content: React.ReactNode;
  footer: React.ReactNode;
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

type TrayHostSlot = {
  assignmentId: number;
  payload: PresentedTray | null;
  visible: boolean;
  interactive: boolean;
};

const createIdleSlot = (): TrayHostSlot => ({
  assignmentId: 0,
  payload: null,
  visible: false,
  interactive: false,
});

const resolveNextActiveSlotIndex = (
  slots: [TrayHostSlot, TrayHostSlot],
  previousActiveSlotIndex: number | null,
) => {
  if (previousActiveSlotIndex !== null) {
    return previousActiveSlotIndex === 0 ? 1 : 0;
  }

  const idleSlotIndex = slots.findIndex((slot) => slot.payload === null);

  if (idleSlotIndex >= 0) {
    return idleSlotIndex;
  }

  const hiddenSlotIndex = slots.findIndex((slot) => !slot.visible);

  return hiddenSlotIndex >= 0 ? hiddenSlotIndex : 0;
};

export const TrayPresenter: React.FC = () => {
  const registry = useTrayHostSelector((state) => state.registry);
  const activeTrayId = useTrayHostSelector((state) => state.activeTrayId);
  const activeIndex = useTrayHostSelector((state) => state.activeIndex);
  const keyboardHeight = useTrayHostSelector((state) => state.keyboardHeight);
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const { justOpenedRef } = useTrayRuntimeStore();
  const nextAssignmentIdRef = useRef(0);
  const activeSlotIndexRef = useRef<number | null>(null);
  const previousActiveRootTrayIdRef = useRef<string | null>(null);
  const [hostSlots, setHostSlots] = useState<[TrayHostSlot, TrayHostSlot]>([
    createIdleSlot(),
    createIdleSlot(),
  ]);

  const activeHost = useMemo<PresentedTray | null>(() => {
    if (!activeTrayId) {
      return null;
    }

    const registration = registry[activeTrayId];

    if (!registration) {
      return null;
    }

    const trayTotal = registration.steps.length;
    const trayIndex = clampIndex(activeIndex, trayTotal);
    const step = registration.steps[trayIndex];

    if (!step) {
      return null;
    }

    const stepOptions = resolveTrayStepOptions(step.options);
    const isFirstRender = justOpenedRef.current && trayIndex === 0;

    return {
      rootTrayId: activeTrayId,
      trayId: `${activeTrayId}-${step.key}`,
      content: (
        <TrayScopeProvider value={activeTrayId}>
          <TrayStepOptionsProvider value={stepOptions}>
            <TrayStepContent
              stepKey={`${activeTrayId}-${step.key}`}
              scale={stepOptions.scale}
              skipEntering={isFirstRender}
            >
              {step.content}
            </TrayStepContent>
          </TrayStepOptionsProvider>
        </TrayScopeProvider>
      ),
      footer: registration.footer ? (
        <TrayScopeProvider value={activeTrayId}>
          <TrayStepOptionsProvider value={stepOptions}>
            {registration.footer}
          </TrayStepOptionsProvider>
        </TrayScopeProvider>
      ) : null,
      fullScreen: stepOptions.fullScreen,
      fullScreenDraggable: stepOptions.fullScreenDraggable,
      containerStyle: stepOptions.style,
      className: stepOptions.className,
      footerStyle: stepOptions.footerStyle,
      footerClassName: stepOptions.footerClassName,
    };
  }, [activeIndex, activeTrayId, justOpenedRef, registry]);

  const orderedHostSlots = useMemo(
    () =>
      hostSlots
        .map((slot, index) => ({
          index,
          slot,
          priority: slot.interactive ? 2 : slot.visible ? 1 : 0,
        }))
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }

          return left.index - right.index;
        }),
    [hostSlots],
  );

  const handleSlotCloseComplete = useCallback(
    (slotIndex: number, assignmentId: number) => {
      setHostSlots((current) => {
        const slot = current[slotIndex];

        if (
          !slot ||
          slot.assignmentId !== assignmentId ||
          slot.visible ||
          activeSlotIndexRef.current === slotIndex
        ) {
          return current;
        }

        const next = [...current] as [TrayHostSlot, TrayHostSlot];
        next[slotIndex] = createIdleSlot();
        return next;
      });
    },
    [],
  );

  useLayoutEffect(() => {
    const previousRootTrayId = previousActiveRootTrayIdRef.current;
    const nextRootTrayId = activeHost?.rootTrayId ?? null;

    setHostSlots((current) => {
      const next = [...current] as [TrayHostSlot, TrayHostSlot];
      const previousActiveSlotIndex = activeSlotIndexRef.current;

      if (previousRootTrayId === nextRootTrayId) {
        if (!activeHost) {
          return current;
        }

        const targetSlotIndex = previousActiveSlotIndex ?? 0;
        const targetSlot = next[targetSlotIndex];

        next[targetSlotIndex] = {
          assignmentId:
            targetSlot.assignmentId ||
            nextAssignmentIdRef.current + 1,
          payload: activeHost,
          visible: true,
          interactive: true,
        };

        if (targetSlot.assignmentId === 0) {
          nextAssignmentIdRef.current += 1;
          next[targetSlotIndex].assignmentId = nextAssignmentIdRef.current;
        }

        activeSlotIndexRef.current = targetSlotIndex;
        return next;
      }

      if (
        previousActiveSlotIndex !== null &&
        next[previousActiveSlotIndex].payload
      ) {
        next[previousActiveSlotIndex] = {
          ...next[previousActiveSlotIndex],
          visible: false,
          interactive: false,
        };
      }

      if (!activeHost) {
        activeSlotIndexRef.current = null;
        return next;
      }

      const nextActiveSlotIndex = resolveNextActiveSlotIndex(
        next,
        previousActiveSlotIndex,
      );

      nextAssignmentIdRef.current += 1;
      next[nextActiveSlotIndex] = {
        assignmentId: nextAssignmentIdRef.current,
        payload: activeHost,
        visible: true,
        interactive: true,
      };
      activeSlotIndexRef.current = nextActiveSlotIndex;

      return next;
    });

    previousActiveRootTrayIdRef.current = nextRootTrayId;

    if (nextRootTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeHost]);

  return (
    <>
      {orderedHostSlots.map(({ slot, index }) => {
        const payload = slot.payload;

        return (
          <ActionTray
            key={`tray-host-slot-${index}`}
            assignmentId={slot.assignmentId}
            visible={slot.visible}
            interactive={slot.interactive}
            rootTrayId={payload?.rootTrayId}
            content={payload?.content}
            footer={payload?.footer}
            onClose={slot.interactive ? requestCloseActiveTray : () => {}}
            onCloseComplete={() =>
              handleSlotCloseComplete(index, slot.assignmentId)
            }
            trayId={payload?.trayId}
            fullScreen={payload?.fullScreen}
            fullScreenDraggable={payload?.fullScreenDraggable}
            containerStyle={payload?.containerStyle}
            className={payload?.className}
            footerStyle={payload?.footerStyle}
            footerClassName={payload?.footerClassName}
            keyboardHeight={keyboardHeight}
            dismissKeyboard={() =>
              dismissKeyboardForTray(payload?.rootTrayId ?? null)
            }
          />
        );
      })}
    </>
  );
};
