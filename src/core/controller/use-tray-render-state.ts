import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";
import type { TrayTransitionContract } from "../../runtime/types";
import { log } from "../logger";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import { markTrayBoundarySnapshotCommitted } from "../../telemetry/tray-boundary-timing";

// render state holds the committed payload while newer props continue to stream in
type TraySnapshot = {
  prepared?: boolean;
  visible?: boolean;
  rootTrayId?: string;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  keyboardAware?: boolean;
  fullScreen?: boolean;
  fullScreenBackgroundScale?: number;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  transitionContract?: TrayTransitionContract | null;
};

type InternalRenderedTrayState = RenderedTrayState;

export type TrayRenderSnapshotStore = {
  getSnapshot: () => RenderedTrayState;
  subscribe: (listener: () => void) => () => void;
  publish: (snapshot: RenderedTrayState) => void;
};

const createTrayRenderSnapshotStore = (
  initialSnapshot: RenderedTrayState,
): TrayRenderSnapshotStore => {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish: (nextSnapshot) => {
      if (snapshot === nextSnapshot) {
        return;
      }

      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener());
    },
  };
};

// The visual subtree can receive a committed payload without making the
// controller host reconcile its measurement and lifecycle hooks again.
export const useTrayRenderSnapshot = (
  store: TrayRenderSnapshotStore,
) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

// Subscribe to one payload region without making the subscriber observe the
// other regions. The store publishes one coherent snapshot, but React's
// external-store contract compares the selected snapshot with Object.is. A
// stable region getter therefore prevents an unchanged header/footer from
// reconciling when only the step body changes.
export const useTrayRenderSnapshotRegion = <T extends keyof RenderedTrayState>(
  store: TrayRenderSnapshotStore,
  region: T,
): RenderedTrayState[T] => {
  const getRegionSnapshot = React.useCallback(
    () => store.getSnapshot()[region],
    [region, store],
  );

  return useSyncExternalStore(
    store.subscribe,
    getRegionSnapshot,
    getRegionSnapshot,
  );
};

// convert a prop snapshot into the normalized rendered shell shape
const toRenderedTrayState = ({
  header,
  content,
  footer,
  trayId,
  keyboardAware,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
}: TraySnapshot): RenderedTrayState => ({
  header: header ?? null,
  content: content ?? null,
  footer: footer ?? null,
  trayId,
  keyboardAware,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
});

// compare shell snapshots before publishing another render
const areTrayStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.header === next.header &&
  current.content === next.content &&
  current.footer === next.footer &&
  current.trayId === next.trayId &&
  current.keyboardAware === next.keyboardAware &&
  current.fullScreen === next.fullScreen &&
  current.fullScreenBackgroundScale === next.fullScreenBackgroundScale &&
  current.fullScreenSafeAreaTop === next.fullScreenSafeAreaTop &&
  current.fullScreenDraggable === next.fullScreenDraggable &&
  current.containerStyle === next.containerStyle &&
  current.className === next.className &&
  current.footerStyle === next.footerStyle &&
  current.footerClassName === next.footerClassName &&
  current.transitionContract === next.transitionContract;

// Region payloads are delivered through the snapshot store. The controller
// host only needs another React state commit when shell topology/configuration
// changes; replacing an already-mounted header/body/footer node does not
// require rerunning the measurement and animation hook graph.
const areTrayShellPresentationStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.keyboardAware === next.keyboardAware &&
  current.fullScreen === next.fullScreen &&
  current.fullScreenBackgroundScale === next.fullScreenBackgroundScale &&
  current.fullScreenSafeAreaTop === next.fullScreenSafeAreaTop &&
  current.fullScreenDraggable === next.fullScreenDraggable &&
  current.containerStyle === next.containerStyle &&
  current.className === next.className &&
  current.footerStyle === next.footerStyle &&
  current.footerClassName === next.footerClassName &&
  (current.header != null) === (next.header != null) &&
  (current.content != null) === (next.content != null) &&
  (current.footer != null) === (next.footer != null);

const areTrayShellStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.trayId === next.trayId &&
  current.transitionContract === next.transitionContract &&
  areTrayShellPresentationStatesEqual(current, next);

// reject transient empty payloads before they erase visible content
const commitTraySnapshot = (
  current: InternalRenderedTrayState,
  next: RenderedTrayState,
): InternalRenderedTrayState => {
  const isTransientEmptyPayload =
    current.trayId !== undefined &&
    next.trayId !== undefined &&
    current.trayId === next.trayId &&
    current.fullScreen === next.fullScreen &&
    next.header == null &&
    next.content == null &&
    (current.header != null || current.content != null);

  if (isTransientEmptyPayload) {
    log("RENDER SNAPSHOT PUBLISH IGNORED — transient empty payload", {
      current: describeTrayState(current),
      next: describeTrayState(next),
    });
    return current;
  }

  if (areTrayStatesEqual(current, next)) {
    // returning current avoids a render when passive sync repeats the same snapshot
    return current;
  }

  return next;
};

// expose the fields needed to diagnose a rendered shell snapshot
const describeTrayState = (state: RenderedTrayState) => ({
  trayId: state.trayId,
  fullScreen: state.fullScreen ?? false,
  hasHeader: state.header != null,
  hasContent: state.content != null,
  hasFooter: state.footer != null,
  transitionGeneration: state.transitionContract?.generation,
  transitionBoundary: state.transitionContract?.boundary,
  transition: describeTrayTransition(state.transitionContract),
});

// retain a stable rendered payload while transitions consume new props
export const useTrayRenderState = ({
  prepared = false,
  visible = false,
  rootTrayId,
  header,
  content,
  footer,
  trayId,
  keyboardAware,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
}: TraySnapshot) => {
  const headerRef = useRef(header);
  headerRef.current = header;

  const contentRef = useRef(content);
  contentRef.current = content;

  const footerRef = useRef(footer);
  footerRef.current = footer;

  const trayIdRef = useRef(trayId);
  trayIdRef.current = trayId;

  const keyboardAwareRef = useRef(keyboardAware);
  keyboardAwareRef.current = keyboardAware;

  const fullScreenRef = useRef(fullScreen);
  fullScreenRef.current = fullScreen;

  const fullScreenBackgroundScaleRef = useRef(fullScreenBackgroundScale);
  fullScreenBackgroundScaleRef.current = fullScreenBackgroundScale;

  const fullScreenSafeAreaTopRef = useRef(fullScreenSafeAreaTop);
  fullScreenSafeAreaTopRef.current = fullScreenSafeAreaTop;

  const fullScreenDraggableRef = useRef(fullScreenDraggable);
  fullScreenDraggableRef.current = fullScreenDraggable;

  const containerStyleRef = useRef(containerStyle);
  containerStyleRef.current = containerStyle;

  const classNameRef = useRef(className);
  classNameRef.current = className;

  const footerStyleRef = useRef(footerStyle);
  footerStyleRef.current = footerStyle;

  const footerClassNameRef = useRef(footerClassName);
  footerClassNameRef.current = footerClassName;

  const transitionContractRef = useRef(transitionContract);
  transitionContractRef.current = transitionContract;

  // A prepared host already owns the controller/native shell. On its first
  // presentation, use the incoming payload during this render instead of
  // waiting for the visibility effect to publish a second snapshot.
  const wasPreparedRef = useRef(prepared);
  const preparedActivation =
    visible && wasPreparedRef.current && prepared !== true;
  wasPreparedRef.current = prepared;

  const initialSnapshot = toRenderedTrayState({
    content,
    header,
    footer,
    trayId,
    keyboardAware,
    fullScreen,
    fullScreenBackgroundScale,
    fullScreenSafeAreaTop,
    fullScreenDraggable,
    containerStyle,
    className,
    footerStyle,
    footerClassName,
    transitionContract,
  });
  const snapshotStoreRef = useRef<TrayRenderSnapshotStore | null>(null);
  if (snapshotStoreRef.current === null) {
    snapshotStoreRef.current = createTrayRenderSnapshotStore(initialSnapshot);
  }
  const snapshotStore = snapshotStoreRef.current;
  const renderedTrayRef = useRef<InternalRenderedTrayState>(initialSnapshot);
  const [renderedTray, setRenderedTray] =
    useState<InternalRenderedTrayState>(initialSnapshot);
  const lastRequestedSnapshotRef = useRef<RenderedTrayState | null>(null);

  // Keep the content-free visual tree mounted while a host is prepared. The
  // assignment reset clears its snapshot store, but clearing the rendered
  // tray id here would unmount the native shell and make activation mount it
  // again on the opening path.
  const renderedTrayForRender =
    (prepared && !visible) || preparedActivation
      ? initialSnapshot
      : snapshotStore.getSnapshot();

  renderedTrayRef.current = renderedTrayForRender;

  // Record the snapshot only after React has committed the rendered payload.
  // The previous marker lived in a passive prop-sync effect, so it described
  // the request for a state update and could precede the rendered-commit mark,
  // producing impossible negative boundary durations.
  useLayoutEffect(() => {
    if (!visible || renderedTrayForRender.trayId === undefined) {
      return;
    }

    markTrayBoundarySnapshotCommitted(
      rootTrayId,
      renderedTrayForRender.transitionContract,
      renderedTrayForRender.trayId,
    );
  }, [
    preparedActivation,
    renderedTray,
    renderedTrayForRender,
    rootTrayId,
    visible,
  ]);

  const publishSnapshot = useCallback(
    (next: RenderedTrayState) => {
      const lastRequestedSnapshot = lastRequestedSnapshotRef.current;

      if (
        lastRequestedSnapshot !== null &&
        areTrayStatesEqual(lastRequestedSnapshot, next)
      ) {
        return;
      }

      lastRequestedSnapshotRef.current = next;
      const current = snapshotStore.getSnapshot();
      const committed = commitTraySnapshot(current, next);

      log("RENDER SNAPSHOT PUBLISH", {
        current: describeTrayState(current),
        next: describeTrayState(next),
      });

      if (committed === current) {
        return;
      }

      renderedTrayRef.current = committed;
      snapshotStore.publish(committed);

      // Same-mode step changes replace the arbitrary React payload and the
      // transition descriptor, but not the shell presentation contract. Keep
      // the committed snapshot out of the controller state update in this
      // case; Tray still receives the new transition descriptor directly,
      // while the snapshot store updates only the payload regions. Boundary
      // changes retain the state update because geometry and animation policy
      // must change together.
      const isSameModeStepCommit =
        current.trayId !== undefined &&
        committed.trayId !== undefined &&
        current.trayId !== committed.trayId &&
        current.fullScreen === committed.fullScreen &&
        current.transitionContract?.fullScreenChanged !== true &&
        committed.transitionContract?.fullScreenChanged !== true &&
        areTrayShellPresentationStatesEqual(current, committed);

      if (!isSameModeStepCommit) {
        setRenderedTray(committed);
      }
    },
    [snapshotStore],
  );

  const showLatestSnapshot = useCallback(() => {
    // refs let passive effects publish the newest props without changing callback identity
    const next = toRenderedTrayState({
      content: contentRef.current,
      header: headerRef.current,
      footer: footerRef.current,
      trayId: trayIdRef.current,
      keyboardAware: keyboardAwareRef.current,
      fullScreen: fullScreenRef.current,
      fullScreenBackgroundScale: fullScreenBackgroundScaleRef.current,
      fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
      fullScreenDraggable: fullScreenDraggableRef.current,
      containerStyle: containerStyleRef.current,
      className: classNameRef.current,
      footerStyle: footerStyleRef.current,
      footerClassName: footerClassNameRef.current,
      transitionContract: transitionContractRef.current,
    });

    publishSnapshot(next);
  }, [publishSnapshot]);

  const syncRenderedNodes = useCallback((activeTrayId?: string) => {
    if (activeTrayId === undefined) {
      return;
    }

    const current = snapshotStore.getSnapshot();
    if (current.trayId !== activeTrayId) {
      log("RENDER SNAPSHOT SYNC IGNORED", {
        activeTrayId,
        current: describeTrayState(current),
      });
      // same host node sync must not steal a transition owned by another tray id
      return;
    }

    const next = {
      // preserve committed regions across native prop gaps; real step changes
      // publish a new snapshot
      content:
        contentRef.current ??
        (fullScreenRef.current === current.fullScreen
          ? current.content
          : null),
      header:
        headerRef.current ??
        (fullScreenRef.current === current.fullScreen
          ? current.header
          : null),
      footer: footerRef.current ?? null,
      trayId: current.trayId,
      keyboardAware: keyboardAwareRef.current,
      fullScreen: fullScreenRef.current,
      fullScreenBackgroundScale: fullScreenBackgroundScaleRef.current,
      fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
      fullScreenDraggable: fullScreenDraggableRef.current,
      containerStyle: containerStyleRef.current,
      className: classNameRef.current,
      footerStyle: footerStyleRef.current,
      footerClassName: footerClassNameRef.current,
      transitionContract: transitionContractRef.current,
    };

    const lastRequestedSnapshot = lastRequestedSnapshotRef.current;

    if (
      lastRequestedSnapshot !== null &&
      areTrayStatesEqual(lastRequestedSnapshot, next)
    ) {
      return;
    }

    lastRequestedSnapshotRef.current = next;
    log("RENDER SNAPSHOT NODE SYNC", {
      current: describeTrayState(current),
      next: describeTrayState(next),
    });
    const committed = commitTraySnapshot(current, next);

    if (committed === current) {
      return;
    }

    renderedTrayRef.current = committed;
    snapshotStore.publish(committed);
    if (!areTrayShellStatesEqual(current, committed)) {
      setRenderedTray(committed);
    }
  }, [snapshotStore]);

  const clear = useCallback(() => {
    lastRequestedSnapshotRef.current = null;
    const current = snapshotStore.getSnapshot();
    const cleared = {
      content: null,
      header: null,
      footer: null,
      trayId: undefined,
      keyboardAware: undefined,
      fullScreen: undefined,
      fullScreenBackgroundScale: undefined,
      fullScreenSafeAreaTop: undefined,
      fullScreenDraggable: undefined,
      containerStyle: undefined,
      className: undefined,
      footerStyle: undefined,
      footerClassName: undefined,
      transitionContract: null,
    };
    log("RENDER SNAPSHOT CLEAR", {
      current: describeTrayState(current),
    });
    renderedTrayRef.current = cleared;
    snapshotStore.publish(cleared);
    setRenderedTray(cleared);
  }, [snapshotStore]);

  return {
    state: {
      renderedContent: renderedTrayForRender.content,
      renderedHeader: renderedTrayForRender.header,
      renderedFooter: renderedTrayForRender.footer,
      renderedTrayId: renderedTrayForRender.trayId,
      renderedKeyboardAware: renderedTrayForRender.keyboardAware ?? false,
      renderedFullScreen: renderedTrayForRender.fullScreen ?? false,
      renderedFullScreenBackgroundScale:
        renderedTrayForRender.fullScreenBackgroundScale ?? 1,
      renderedFullScreenSafeAreaTop:
        renderedTrayForRender.fullScreenSafeAreaTop ?? false,
      renderedFullScreenDraggable:
        renderedTrayForRender.fullScreenDraggable ?? true,
      renderedContainerStyle: renderedTrayForRender.containerStyle,
      renderedClassName: renderedTrayForRender.className,
      renderedFooterStyle: renderedTrayForRender.footerStyle,
      renderedFooterClassName: renderedTrayForRender.footerClassName,
      renderedTransitionContract:
        renderedTrayForRender.transitionContract ?? null,
    },
    snapshotStore,
    renderedSnapshotRef: renderedTrayRef,
    renderSnapshotOverride: preparedActivation
      ? renderedTrayForRender
      : undefined,
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
