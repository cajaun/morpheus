import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useTrayHostActions,
  useTrayHostSelector,
} from "./tray-context";
import type { TrayHostStateValue } from "./types";
import { logTrayProfilerCommit } from "../telemetry/tray-profiler";
import { isTrayInstrumentationEnabled } from "../telemetry/config";
import {
  createPresentedTray,
  NestedTrayStack,
  RootTraySlots,
  arePresentedTrayListsEquivalent,
  arePresentedTraysEquivalent,
  resolvePresenterTransitionScope,
  type PresentedTray,
  type PresentedTrayRenderer,
} from "./presenter";

const selectRegistry = (state: TrayHostStateValue) => state.registry;
const selectStack = (state: TrayHostStateValue) => state.stack;
const selectTransition = (state: TrayHostStateValue) => state.lastTransition;

// resolve runtime stack entries into root and nested host groups
// resolve runtime stack entries into root and nested host presentations
export const TrayPresenter: React.FC<{
  renderHost: PresentedTrayRenderer;
}> = ({ renderHost }) => {
  const registry = useTrayHostSelector(selectRegistry);
  const stack = useTrayHostSelector(selectStack);
  const transition = useTrayHostSelector(selectTransition);
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const previousIndexByTrayRef = useRef<Record<string, number>>({});
  const previousStackTrayIdsRef = useRef<readonly string[]>([]);
  const previousRootHostRef = useRef<PresentedTray | null>(null);
  const previousNestedHostsRef = useRef<PresentedTray[]>([]);
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

    const nextHost = createPresentedTray({
      entry,
      registration,
      previousIndex: previousIndexByTrayRef.current[entry.trayId],
      transition: transitionScope.root,
      stackIndex: 0,
      stackLength: stack.length,
    });

    const previousHost = previousRootHostRef.current;
    const stableHost =
      previousHost !== null &&
      nextHost !== null &&
      arePresentedTraysEquivalent(previousHost, nextHost)
        ? previousHost
        : nextHost;

    return stableHost;
  }, [registry, stack, transitionScope.root]);

  const nestedHosts = useMemo<PresentedTray[]>(() => {
    const nextHosts = stack.slice(1).flatMap((entry, index) => {
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

    const previousHosts = previousNestedHostsRef.current;
    const stableHosts = nextHosts.map((host) => {
      const previousHost = previousHosts.find(
        (candidate) => candidate.rootTrayId === host.rootTrayId,
      );

      return previousHost && arePresentedTraysEquivalent(previousHost, host)
        ? previousHost
        : host;
    });

    return arePresentedTrayListsEquivalent(previousHosts, stableHosts)
      ? previousHosts
      : stableHosts;
  }, [registry, stack, transitionScope.nested]);

  useEffect(() => {
    const nextIndexes: Record<string, number> = {};

    stack.forEach((entry) => {
      nextIndexes[entry.trayId] = entry.index;
    });

    previousIndexByTrayRef.current = nextIndexes;
    previousStackTrayIdsRef.current = stack.map((entry) => entry.trayId);
    previousRootHostRef.current = rootHost;
    previousNestedHostsRef.current = nestedHosts;
  }, [nestedHosts, rootHost, stack]);

  const rootSlots = useMemo(
    () => (
      <RootTraySlots
        activeHost={rootHost}
        requestCloseActiveTray={requestCloseActiveTray}
        dismissKeyboardForTray={dismissKeyboardForTray}
        transitionContract={transitionScope.root}
        renderHost={renderHost}
      />
    ),
    [
      dismissKeyboardForTray,
      renderHost,
      requestCloseActiveTray,
      rootHost,
      transitionScope.root,
    ],
  );
  const nestedStack = useMemo(
    () => (
      <NestedTrayStack
        hosts={nestedHosts}
        requestCloseActiveTray={requestCloseActiveTray}
        dismissKeyboardForTray={dismissKeyboardForTray}
        transitionContract={transitionScope.nested}
        renderHost={renderHost}
      />
    ),
    [
      dismissKeyboardForTray,
      nestedHosts,
      renderHost,
      requestCloseActiveTray,
      transitionScope.nested,
    ],
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
