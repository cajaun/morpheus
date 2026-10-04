import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useTrayHostActions,
  useTrayHostSelector,
} from "./tray-context";
import { logActionTrayProfilerCommit } from "../telemetry/action-tray-profiler";
import { isActionTrayInstrumentationEnabled } from "../telemetry/config";
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
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const previousIndexByTrayRef = useRef<Record<string, number>>({});
  const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      logActionTrayProfilerCommit(
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      );
    },
    [],
  );

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

  const rootSlots = (
    <RootTraySlots
      activeHost={rootHost}
      requestCloseActiveTray={requestCloseActiveTray}
      dismissKeyboardForTray={dismissKeyboardForTray}
      transitionContract={transition}
      renderHost={renderHost}
    />
  );
  const nestedStack = (
    <NestedTrayStack
      hosts={nestedHosts}
      requestCloseActiveTray={requestCloseActiveTray}
      dismissKeyboardForTray={dismissKeyboardForTray}
      transitionContract={transition}
      renderHost={renderHost}
    />
  );
  const instrumentationEnabled = isActionTrayInstrumentationEnabled();
  const presenterTree = instrumentationEnabled ? (
    <>
      <React.Profiler id="action-tray-root-slots" onRender={handleProfileRender}>
        {rootSlots}
      </React.Profiler>
      <React.Profiler
        id="action-tray-nested-stack"
        onRender={handleProfileRender}
      >
        {nestedStack}
      </React.Profiler>
    </>
  ) : (
    <>
      {rootSlots}
      {nestedStack}
    </>
  );

  if (!instrumentationEnabled) {
    return presenterTree;
  }

  return (
    <React.Profiler
      id="action-tray-presenter"
      onRender={handleProfileRender}
    >
      {presenterTree}
    </React.Profiler>
  );
};
