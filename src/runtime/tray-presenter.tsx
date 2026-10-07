import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useTrayHostActions,
  useTrayHostSelector,
} from "./tray-context";
import { logTrayProfilerCommit } from "../telemetry/tray-profiler";
import { isTrayInstrumentationEnabled } from "../telemetry/config";
import {
  createPresentedTray,
  NestedTrayStack,
  RootTraySlots,
  resolvePresenterTransitionScope,
  type PresentedTray,
  type PresentedTrayRenderer,
} from "./presenter";

// resolve runtime stack entries into root and nested host groups
// resolve runtime stack entries into root and nested host presentations
export const TrayPresenter: React.FC<{
  renderHost: PresentedTrayRenderer;
}> = ({ renderHost }) => {
  const registry = useTrayHostSelector((state) => state.registry);
  const stack = useTrayHostSelector((state) => state.stack);
  const transition = useTrayHostSelector((state) => state.lastTransition);
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const previousIndexByTrayRef = useRef<Record<string, number>>({});
  const previousStackTrayIdsRef = useRef<readonly string[]>([]);
  const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      logTrayProfilerCommit(
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

  const transitionScope = useMemo(
    () =>
      resolvePresenterTransitionScope({
        transition,
        currentStack: stack,
        previousStackTrayIds: previousStackTrayIdsRef.current,
      }),
    [stack, transition],
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
      transition: transitionScope.root,
      stackIndex: 0,
      stackLength: stack.length,
    });
  }, [registry, stack, transitionScope.root]);

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
        transition: transitionScope.nested,
        stackIndex: index + 1,
        stackLength: stack.length,
      });

      return host ? [host] : [];
    });
  }, [registry, stack, transitionScope.nested]);

  useEffect(() => {
    const nextIndexes: Record<string, number> = {};

    stack.forEach((entry) => {
      nextIndexes[entry.trayId] = entry.index;
    });

    previousIndexByTrayRef.current = nextIndexes;
    previousStackTrayIdsRef.current = stack.map((entry) => entry.trayId);
  }, [stack]);

  const rootSlots = (
    <RootTraySlots
      activeHost={rootHost}
      requestCloseActiveTray={requestCloseActiveTray}
      dismissKeyboardForTray={dismissKeyboardForTray}
      transitionContract={transitionScope.root}
      renderHost={renderHost}
    />
  );
  const nestedStack = (
    <NestedTrayStack
      hosts={nestedHosts}
      requestCloseActiveTray={requestCloseActiveTray}
      dismissKeyboardForTray={dismissKeyboardForTray}
      transitionContract={transitionScope.nested}
      renderHost={renderHost}
    />
  );
  const instrumentationEnabled = isTrayInstrumentationEnabled();
  const presenterTree = instrumentationEnabled ? (
    <>
      <React.Profiler id="tray-root-slots" onRender={handleProfileRender}>
        {rootSlots}
      </React.Profiler>
      <React.Profiler
        id="tray-nested-stack"
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
      id="tray-presenter"
      onRender={handleProfileRender}
    >
      {presenterTree}
    </React.Profiler>
  );
};
