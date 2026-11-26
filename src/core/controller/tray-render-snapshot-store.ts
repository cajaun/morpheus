import React, { useSyncExternalStore } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";
import type { TrayTransitionContract } from "../../runtime/types";
import { log } from "../logger";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";

// render state holds the committed payload while newer props stream in
export type TraySnapshot = {
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
  transitionContract?: TrayTransitionContract | null;
};

export type InternalRenderedTrayState = RenderedTrayState;

export type TrayRenderSnapshotStore = {
  getSnapshot: () => RenderedTrayState;
  subscribe: (listener: () => void) => () => void;
  publish: (snapshot: RenderedTrayState) => void;
};

export const createTrayRenderSnapshotStore = (
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

// the visual subtree receives committed payloads without reconciling the controller's measurement and lifecycle hooks
export const useTrayRenderSnapshot = (store: TrayRenderSnapshotStore) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

// subscribe to one payload region so an unchanged header or footer skips reconciling when the body changes
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

// normalize a prop snapshot into the rendered shell shape
export const toRenderedTrayState = ({
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
  transitionContract,
});

// compare shell snapshots before publishing another render
export const areTrayStatesEqual = (
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
  current.transitionContract === next.transitionContract;

// the controller host needs a React commit for topology or configuration changes, region nodes arrive through the snapshot store
export const areTrayShellPresentationStatesEqual = (
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
  (current.header != null) === (next.header != null) &&
  (current.content != null) === (next.content != null) &&
  (current.footer != null) === (next.footer != null);

export const areTrayShellStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.trayId === next.trayId &&
  current.transitionContract === next.transitionContract &&
  areTrayShellPresentationStatesEqual(current, next);

// transient empty payloads cannot erase visible content
export const commitTraySnapshot = (
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
    // returning current skips a render when passive sync repeats the snapshot
    return current;
  }

  return next;
};

// fields that describe a rendered shell snapshot in logs
export const describeTrayState = (state: RenderedTrayState) => ({
  trayId: state.trayId,
  fullScreen: state.fullScreen ?? false,
  hasHeader: state.header != null,
  hasContent: state.content != null,
  hasFooter: state.footer != null,
  transitionGeneration: state.transitionContract?.generation,
  transitionBoundary: state.transitionContract?.boundary,
  transition: describeTrayTransition(state.transitionContract),
});
