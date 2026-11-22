import { useCallback, useRef, useState } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import { RenderedTrayState } from "../types";
import { log } from "../logger";
import { markTrayBoundarySnapshotCommitted } from "../../telemetry/tray-boundary-timing";
import {
  createTrayRenderSnapshotStore,
  toRenderedTrayState,
  areTrayStatesEqual,
  areTrayShellPresentationStatesEqual,
  areTrayShellStatesEqual,
  commitTraySnapshot,
  describeTrayState,
  type TraySnapshot,
  type InternalRenderedTrayState,
  type TrayRenderSnapshotStore,
} from "./tray-render-snapshot-store";
export { useTrayRenderSnapshot, useTrayRenderSnapshotRegion } from "./tray-render-snapshot-store";
export type { TrayRenderSnapshotStore } from "./tray-render-snapshot-store";

// a stable rendered payload while transitions consume new props
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

  // a prepared host uses the incoming payload on its first presentation instead of waiting for a second snapshot
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

  // a prepared host keeps its content-free visual tree mounted so activation never remounts the native shell
  const renderedTrayForRender =
    (prepared && !visible) || preparedActivation
      ? initialSnapshot
      : snapshotStore.getSnapshot();

  renderedTrayRef.current = renderedTrayForRender;

  // mark the snapshot after React commits the rendered payload, a passive effect would precede the rendered-commit mark
  useProfiledTrayLayoutEffect("useTrayRenderState.markCommittedSnapshot", () => {
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

      // same-mode step changes keep the snapshot out of controller state and update the payload regions, boundary changes update both because geometry and animation policy change together
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
      // same-host node sync never steals a transition owned by another tray id
      return;
    }

    const next = {
      // committed regions survive native prop gaps, real step changes publish a new snapshot
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
