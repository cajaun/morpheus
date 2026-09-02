import React, { useEffect, useMemo, useRef } from "react";
import {
  useTrayHostActions,
  useTrayHostSelector,
} from "./tray-context";
import {
  createPresentedTray,
  NestedTrayStack,
  RootTraySlots,
  type PresentedTray,
  type PresentedActionTrayRenderer,
} from "./presenter";

// resolve runtime stack entries into root and nested host groups
// resolve runtime stack entries into root and nested host presentations
export const TrayPresenter: React.FC<{
  renderHost: PresentedActionTrayRenderer;
}> = ({ renderHost }) => {
  const registry = useTrayHostSelector((state) => state.registry);
  const stack = useTrayHostSelector((state) => state.stack);
  const transition = useTrayHostSelector((state) => state.lastTransition);
  const { requestCloseActiveTray } = useTrayHostActions();
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
      transition,
      stackIndex: 0,
      stackLength: stack.length,
    });
  }, [registry, stack, transition]);

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
        transition,
        stackIndex: index + 1,
        stackLength: stack.length,
      });

      return host ? [host] : [];
    });
  }, [registry, stack, transition]);

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
        requestCloseActiveTray={requestCloseActiveTray}
        transitionContract={transition}
        renderHost={renderHost}
      />
      <NestedTrayStack
        hosts={nestedHosts}
        requestCloseActiveTray={requestCloseActiveTray}
        transitionContract={transition}
        renderHost={renderHost}
      />
    </>
  );
};
