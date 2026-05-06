import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ActionTray } from "../core/action-tray";
import type { KeyboardTransitionMode } from "../core/action-tray-types";
import { TrayStepContent } from "../tray-step-content";
import {
  resolveTrayStepOptions,
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayHostActions,
  useTrayHostSelector,
  type TrayRegistration,
  type TrayStackEntry,
  type TrayTransitionOptions,
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
  keyboardTransitionMode: KeyboardTransitionMode;
  header: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  fullScreen: boolean;
  fullScreenSafeAreaTop: boolean;
  fullScreenDraggable: boolean;
  dismissible: boolean;
  transition?: TrayTransitionOptions;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  stackIndex: number;
  visible: boolean;
  interactive: boolean;
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

const createPresentedTray = ({
  entry,
  registration,
  previousIndex,
  stackIndex,
  stackLength,
}: {
  entry: TrayStackEntry;
  registration: TrayRegistration;
  previousIndex?: number;
  stackIndex: number;
  stackLength: number;
}): PresentedTray | null => {
  const trayTotal = registration.steps.length;
  const trayIndex = clampIndex(entry.index, trayTotal);
  const step = registration.steps[trayIndex];

  if (!step) {
    return null;
  }

  const stepOptions = resolveTrayStepOptions(step.options);
  const isFirstRender = previousIndex === undefined;
  const keyboardTransitionMode: KeyboardTransitionMode =
    stepOptions.keyboardAware ? "entering" : "idle";

  return {
    rootTrayId: entry.trayId,
    trayId: `${entry.trayId}-${step.key}`,
    keyboardTransitionMode,
    header: step.header ? (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={stepOptions}>
          <TrayStepContent
            stepKey={`${entry.trayId}-${step.key}-header`}
            scale={false}
            skipEntering={isFirstRender}
          >
            {step.header}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ) : null,
    content: (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={stepOptions}>
          <TrayStepContent
            stepKey={`${entry.trayId}-${step.key}`}
            scale={stepOptions.scale}
            skipEntering={isFirstRender}
          >
            {step.content}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ),
    footer: registration.footer ? (
      <TrayScopeProvider value={entry.trayId}>
        <TrayStepOptionsProvider value={stepOptions}>
          {registration.footer}
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    ) : null,
    fullScreen: stepOptions.fullScreen,
    fullScreenSafeAreaTop: stepOptions.fullScreenSafeAreaTop,
    fullScreenDraggable: stepOptions.fullScreenDraggable,
    dismissible: registration.dismissible ?? true,
    transition: registration.transition,
    containerStyle: stepOptions.style,
    className: stepOptions.className,
    footerStyle: stepOptions.footerStyle,
    footerClassName: stepOptions.footerClassName,
    stackIndex,
    visible: true,
    interactive: stackIndex === stackLength - 1,
  };
};

const PresentedActionTray = ({
  payload,
  assignmentId,
  keyboardHeight,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: {
  payload: PresentedTray;
  assignmentId: number;
  keyboardHeight: PresentedTray extends never ? never : any;
  onRequestClose: () => void;
  onCloseComplete: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
}) => {
  return (
    <ActionTray
      assignmentId={assignmentId}
      visible={payload.visible}
      interactive={payload.interactive}
      keyboardTransitionMode={payload.keyboardTransitionMode}
      rootTrayId={payload.rootTrayId}
      content={payload.content}
      header={payload.header}
      footer={payload.footer}
      onClose={payload.interactive ? onRequestClose : () => {}}
      onCloseComplete={onCloseComplete}
      trayId={payload.trayId}
      fullScreen={payload.fullScreen}
      fullScreenSafeAreaTop={payload.fullScreenSafeAreaTop}
      fullScreenDraggable={payload.fullScreenDraggable}
      dismissible={payload.dismissible}
      transition={payload.transition}
      containerStyle={payload.containerStyle}
      className={payload.className}
      footerStyle={payload.footerStyle}
      footerClassName={payload.footerClassName}
      keyboardHeight={keyboardHeight}
      dismissKeyboard={() => dismissKeyboardForTray(payload.rootTrayId)}
    />
  );
};

const RootTraySlots = ({
  activeHost,
  keyboardHeight,
  requestCloseActiveTray,
  dismissKeyboardForTray,
}: {
  activeHost: PresentedTray | null;
  keyboardHeight: PresentedTray extends never ? never : any;
  requestCloseActiveTray: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
}) => {
  const nextAssignmentIdRef = useRef(0);
  const activeSlotIndexRef = useRef<number | null>(null);
  const pendingPresentedHostRef = useRef<PresentedTray | null>(null);
  const [hostSlots, setHostSlots] = useState<[TrayHostSlot, TrayHostSlot]>([
    createIdleSlot(),
    createIdleSlot(),
  ]);

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
        const pendingHost = pendingPresentedHostRef.current;

        if (pendingHost) {
          nextAssignmentIdRef.current += 1;
          next[slotIndex] = {
            assignmentId: nextAssignmentIdRef.current,
            payload: pendingHost,
            visible: true,
            interactive: pendingHost.interactive,
          };
          activeSlotIndexRef.current = slotIndex;
          pendingPresentedHostRef.current = null;
          return next;
        }

        next[slotIndex] = createIdleSlot();
        return next;
      });
    },
    [],
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
          index !== currentActiveSlotIndex &&
          slot.payload !== null &&
          !slot.visible,
      );
      const nextRootTrayId = activeHost?.rootTrayId ?? null;

      if (!activeHost) {
        pendingPresentedHostRef.current = null;

        if (
          currentActiveSlotIndex === null ||
          currentActiveSlot === null ||
          currentActiveSlot.payload === null
        ) {
          return current;
        }

        const closingActiveSlot = currentActiveSlot;

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
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      if (currentRootTrayId === nextRootTrayId) {
        const targetSlotIndex = currentActiveSlotIndex ?? 0;
        const targetSlot = next[targetSlotIndex];

        next[targetSlotIndex] = {
          assignmentId:
            targetSlot.assignmentId ||
            nextAssignmentIdRef.current + 1,
          payload: activeHost,
          visible: true,
          interactive: activeHost.interactive,
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
        currentActiveSlot !== null &&
        currentActiveSlot.payload !== null
      ) {
        const closingActiveSlot = currentActiveSlot;

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
        pendingPresentedHostRef.current = activeHost;
        return current;
      }

      const nextActiveSlotIndex = resolveNextActiveSlotIndex(next, null);

      nextAssignmentIdRef.current += 1;
      next[nextActiveSlotIndex] = {
        assignmentId: nextAssignmentIdRef.current,
        payload: activeHost,
        visible: true,
        interactive: activeHost.interactive,
      };
      activeSlotIndexRef.current = nextActiveSlotIndex;

      return next;
    });
  }, [activeHost]);

  return (
    <>
      {orderedHostSlots.map(({ slot, index }) => {
        const payload = slot.payload;

        if (!payload) {
          return null;
        }

        return (
          <PresentedActionTray
            key={`tray-root-host-slot-${index}-${slot.assignmentId}`}
            payload={{
              ...payload,
              visible: slot.visible,
              interactive: slot.interactive,
            }}
            assignmentId={slot.assignmentId}
            keyboardHeight={keyboardHeight}
            onRequestClose={requestCloseActiveTray}
            onCloseComplete={() =>
              handleSlotCloseComplete(index, slot.assignmentId)
            }
            dismissKeyboardForTray={dismissKeyboardForTray}
          />
        );
      })}
    </>
  );
};

const NestedTrayStack = ({
  hosts,
  keyboardHeight,
  requestCloseActiveTray,
  dismissKeyboardForTray,
}: {
  hosts: PresentedTray[];
  keyboardHeight: PresentedTray extends never ? never : any;
  requestCloseActiveTray: () => void;
  dismissKeyboardForTray: (trayId?: string | null) => void;
}) => {
  const [renderedHosts, setRenderedHosts] = useState<PresentedTray[]>([]);

  useEffect(() => {
    setRenderedHosts((current) => {
      const nextByRootTrayId = new Map(
        hosts.map((host) => [host.rootTrayId, host]),
      );
      const retainedClosingHosts = current
        .filter((host) => !nextByRootTrayId.has(host.rootTrayId))
        .map((host) => ({
          ...host,
          visible: false,
          interactive: false,
        }));

      return [...retainedClosingHosts, ...hosts].sort(
        (left, right) => left.stackIndex - right.stackIndex,
      );
    });
  }, [hosts]);

  const handleCloseComplete = useCallback((rootTrayId: string) => {
    setRenderedHosts((current) =>
      current.filter((host) => host.visible || host.rootTrayId !== rootTrayId),
    );
  }, []);

  return (
    <>
      {renderedHosts.map((payload) => (
        <PresentedActionTray
          key={`tray-nested-host-${payload.rootTrayId}`}
          payload={payload}
          assignmentId={payload.stackIndex + 1}
          keyboardHeight={keyboardHeight}
          onRequestClose={requestCloseActiveTray}
          onCloseComplete={() => handleCloseComplete(payload.rootTrayId)}
          dismissKeyboardForTray={dismissKeyboardForTray}
        />
      ))}
    </>
  );
};

export const TrayPresenter: React.FC = () => {
  const registry = useTrayHostSelector((state) => state.registry);
  const stack = useTrayHostSelector((state) => state.stack);
  const keyboardHeight = useTrayHostSelector((state) => state.keyboardHeight);
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const previousIndexByTrayRef = useRef<Record<string, number>>({});

  const rootHost = useMemo<PresentedTray | null>(() => {
    const entry = stack[0];

    if (!entry) {
      return null;
    }

    const registration = registry[entry.trayId];

    if (!registration) {
      return null;
    }

    return createPresentedTray({
      entry,
      registration,
      previousIndex: previousIndexByTrayRef.current[entry.trayId],
      stackIndex: 0,
      stackLength: stack.length,
    });
  }, [registry, stack]);

  const nestedHosts = useMemo<PresentedTray[]>(() => {
    return stack.slice(1).flatMap((entry, index) => {
      const registration = registry[entry.trayId];

      if (!registration) {
        return [];
      }

      const host = createPresentedTray({
        entry,
        registration,
        previousIndex: previousIndexByTrayRef.current[entry.trayId],
        stackIndex: index + 1,
        stackLength: stack.length,
      });

      return host ? [host] : [];
    });
  }, [registry, stack]);

  useEffect(() => {
    const nextIndexes: Record<string, number> = {};

    stack.forEach((entry) => {
      nextIndexes[entry.trayId] = entry.index;
    });

    previousIndexByTrayRef.current = nextIndexes;
  }, [stack]);

  return (
    <>
      <RootTraySlots
        activeHost={rootHost}
        keyboardHeight={keyboardHeight}
        requestCloseActiveTray={requestCloseActiveTray}
        dismissKeyboardForTray={dismissKeyboardForTray}
      />
      <NestedTrayStack
        hosts={nestedHosts}
        keyboardHeight={keyboardHeight}
        requestCloseActiveTray={requestCloseActiveTray}
        dismissKeyboardForTray={dismissKeyboardForTray}
      />
    </>
  );
};
