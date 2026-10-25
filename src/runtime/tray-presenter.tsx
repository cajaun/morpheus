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
  arePresentedTrayListsEquivalent,
  arePresentedTraysEquivalent,
  createPreparedNestedTray,
  createPreparedNestedTraySelector,
  createTrayPresenterStateSelector,
  resolvePresenterTransitionScope,
  type PresentedTray,
  type PresentedTrayRenderer,
} from "./presenter";

// resolve runtime stack entries into root and nested host groups
// resolve runtime stack entries into root and nested host presentations
export const TrayPresenter: React.FC<{
  renderHost: PresentedTrayRenderer;
}> = ({ renderHost }) => {
  const selectPresenterState = useMemo(
    createTrayPresenterStateSelector,
    [],
  );
  const selectPreparedNestedTrayState = useMemo(
    createPreparedNestedTraySelector,
    [],
  );
  const presenterState = useTrayHostSelector(selectPresenterState);
  const preparedNestedRegistrations = useTrayHostSelector(
    selectPreparedNestedTrayState,
  );
  const { registry, stack, transition } = presenterState;
  const { dismissKeyboardForTray, requestCloseActiveTray } = useTrayHostActions();
  const previousIndexByTrayRef = useRef<Record<string, number>>({});
  const previousStackTrayIdsRef = useRef<readonly string[]>([]);
  const previousRootHostRef = useRef<PresentedTray | null>(null);
  const previousNestedHostsRef = useRef<PresentedTray[]>([]);
  const previousPreparedNestedHostsRef = useRef<PresentedTray[]>([]);
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

  const preparedNestedHosts = useMemo<PresentedTray[]>(() => {
    const nextHosts = Object.entries(preparedNestedRegistrations).map(
      ([trayId, registration]) =>
        createPreparedNestedTray(
          trayId,
          registration,
          registration.parentCanPresentFullScreen,
        ),
    );
    const previousHosts = previousPreparedNestedHostsRef.current;
    const stableHosts = arePresentedTrayListsEquivalent(
      previousHosts,
      nextHosts,
    )
      ? previousHosts
      : nextHosts;

    previousPreparedNestedHostsRef.current = stableHosts;
    return stableHosts;
  }, [preparedNestedRegistrations]);

  const preparedNestedHostByTrayId = useMemo(
    () =>
      new Map(
        preparedNestedHosts.map((host) => [host.rootTrayId, host] as const),
      ),
    [preparedNestedHosts],
  );

  const nestedHosts = useMemo<PresentedTray[]>(() => {
    const previousHosts = previousNestedHostsRef.current;
    const previousHostByTrayId = new Map(
      previousHosts.map((host) => [host.rootTrayId, host]),
    );
    const nextHosts: PresentedTray[] = [];

    for (let stackIndex = 1; stackIndex < stack.length; stackIndex += 1) {
      const entry = stack[stackIndex];
      if (!entry) {
        continue;
      }

      const registration = registry[entry.trayId];

      if (!registration) {
        continue;
      }

      const previousHost = previousHostByTrayId.get(entry.trayId);
      const preparedHost = preparedNestedHostByTrayId.get(entry.trayId);
      const previousMotionCapabilities =
        previousHost || preparedHost
          ? {
              keyboardStickyCapable:
                previousHost?.keyboardStickyCapable === true ||
                preparedHost?.keyboardStickyCapable === true,
              fullScreenMotionCapable:
                previousHost?.fullScreenMotionCapable === true ||
                preparedHost?.fullScreenMotionCapable === true,
            }
          : undefined;

      const host = createPresentedTray({
        entry,
        registration,
        previousMotionCapabilities,
        previousIndex: previousIndexByTrayRef.current[entry.trayId],
        transition: transitionScope.nested,
        stackIndex,
        stackLength: stack.length,
      });

      if (!host) {
        continue;
      }

      nextHosts.push(
        previousHost && arePresentedTraysEquivalent(previousHost, host)
          ? previousHost
          : host,
      );
    }

    return arePresentedTrayListsEquivalent(previousHosts, nextHosts)
      ? previousHosts
      : nextHosts;
  }, [
    preparedNestedHostByTrayId,
    registry,
    stack,
    transitionScope.nested,
  ]);

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
        prewarmedHosts={preparedNestedHosts}
        requestCloseActiveTray={requestCloseActiveTray}
        dismissKeyboardForTray={dismissKeyboardForTray}
        transitionContract={transitionScope.nested}
        renderHost={renderHost}
      />
    ),
    [
      dismissKeyboardForTray,
      nestedHosts,
      preparedNestedHosts,
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
