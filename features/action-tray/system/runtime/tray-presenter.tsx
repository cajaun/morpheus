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

// the presenter maps store state onto a bounded pool of host slots
// that pool lets one tray close while the next waits to take its place
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
  // flip slots when one is already active to preserve overlap
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
  // pendingHost serializes tray replacement across overlapping close animations
  const pendingPresentedHostRef = useRef<PresentedTray | null>(null);
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
    // suppress the first step enter because the shell open animation already covers it
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
  const nextRootTrayId = activeHost?.rootTrayId ?? null;

  const orderedHostSlots = useMemo(
    () =>
      hostSlots
        .map((slot, index) => ({
          index,
          slot,
          priority: slot.interactive ? 2 : slot.visible ? 1 : 0,
        }))
        .sort((left, right) => {
          // render the active slot last so it wins hit testing and stacking
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
        const pendingHost = pendingPresentedHostRef.current;

        if (pendingHost) {
          // recycle the same slot after close completes to avoid mounting a third host
          nextAssignmentIdRef.current += 1;
          next[slotIndex] = {
            assignmentId: nextAssignmentIdRef.current,
            payload: pendingHost,
            visible: true,
            interactive: true,
          };
          activeSlotIndexRef.current = slotIndex;
          pendingPresentedHostRef.current = null;
          justOpenedRef.current = false;
          return next;
        }

        next[slotIndex] = createIdleSlot();
        return next;
      });
    },
    [justOpenedRef],
  );

  useLayoutEffect(() => {
    setHostSlots((current) => {
      const next = [...current] as [TrayHostSlot, TrayHostSlot];
      const currentActiveSlotIndex = activeSlotIndexRef.current;
      const currentActiveSlot =
        currentActiveSlotIndex !== null ? next[currentActiveSlotIndex] : null;
      const currentRootTrayId = currentActiveSlot?.payload?.rootTrayId ?? null;
      const closingSlotIndex = next.findIndex(
        (slot, index) =>
          index !== currentActiveSlotIndex && slot.payload !== null && !slot.visible,
      );
      const nextRootTrayId = activeHost?.rootTrayId ?? null;

      if (!activeHost) {
        // no active host means we only need to drive the current slot to closed
        pendingPresentedHostRef.current = null;

        if (
          currentActiveSlotIndex === null ||
          currentActiveSlot?.payload === null
        ) {
          return current;
        }

        const closingActiveSlot = currentActiveSlot!;
        next[currentActiveSlotIndex] = {
          assignmentId: closingActiveSlot.assignmentId,
          payload: closingActiveSlot.payload,
          visible: false,
          interactive: false,
        };
        activeSlotIndexRef.current = null;
        return next;
      }

      if (pendingPresentedHostRef.current !== null) {
        // coalesce rapid replacements so stale pending trays never flash on screen
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      if (currentRootTrayId === nextRootTrayId) {
        // step changes within one tray should update in place and preserve the host
        const targetSlotIndex = currentActiveSlotIndex ?? 0;
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
        currentActiveSlotIndex !== null &&
        currentActiveSlot?.payload !== null
      ) {
        // cross tray replacement must wait so content never swaps mid close animation
        const closingActiveSlot = currentActiveSlot!;
        pendingPresentedHostRef.current = activeHost;
        next[currentActiveSlotIndex] = {
          assignmentId: closingActiveSlot.assignmentId,
          payload: closingActiveSlot.payload,
          visible: false,
          interactive: false,
        };
        activeSlotIndexRef.current = null;
        return next;
      }

      if (closingSlotIndex >= 0) {
        // if another slot is still winding down we keep the next tray queued
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      // two slots are enough for overlap and keep host count bounded
      const nextActiveSlotIndex = resolveNextActiveSlotIndex(next, null);

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

    if (nextRootTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeHost, justOpenedRef]);

  return (
    <>
      {orderedHostSlots.map(({ slot, index }) => {
        const payload = slot.payload;

        return (
          <ActionTray
            key={`tray-host-slot-${index}-${slot.assignmentId}`}
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
