// adapt runtime payloads into the animated native shell
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { TrayStepContent } from "../../tray-step-content";
import { TrayHeaderTransitionProvider } from "../../primitives/header-transition-context";
import {
  TrayScopeProvider,
  TrayStepOptionsProvider,
  useTrayRuntimeStore,
} from "../../runtime/tray-context";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import {
  logTrayProfilerCommit,
  profileTrayRegion,
} from "../../telemetry/tray-profiler";
import { markTrayBoundaryReactRender } from "../../telemetry/tray-boundary-timing";
import { markTrayStepReactRenderStarted } from "../../telemetry/tray-step-timing";
import { Tray } from "../tray";
import type { PresentedTrayProps } from "../../runtime/presenter/types";
import { arePresentedTraysEquivalent } from "../../runtime/presenter/model";

type PresentedTrayRegionName = "header" | "content" | "footer";

type PresentedTrayPayloadStore = {
  getSnapshot: () => PresentedTrayProps["payload"];
  subscribe: (listener: () => void) => () => void;
  publish: (payload: PresentedTrayProps["payload"]) => void;
};

type PresentedTrayRegionPayload = Pick<
  PresentedTrayProps["payload"],
  | "rootTrayId"
  | "trayId"
  | "stepOptions"
  | "header"
  | "content"
  | "footer"
  | "fullScreen"
  | "fullScreenBoundaryExit"
  | "isFirstRender"
>;

const createPresentedTrayPayloadStore = (
  initialPayload: PresentedTrayProps["payload"],
): PresentedTrayPayloadStore => {
  let currentPayload = initialPayload;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => currentPayload,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    publish: (payload) => {
      if (payload === currentPayload) {
        return;
      }

      currentPayload = payload;
      listeners.forEach((listener) => listener());
    },
  };
};

const arePresentedTrayStepOptionsEquivalent = (
  previous: PresentedTrayRegionPayload["stepOptions"],
  next: PresentedTrayRegionPayload["stepOptions"],
) =>
  previous === next ||
  (previous.hasFooter === next.hasFooter &&
    previous.scale === next.scale &&
    previous.keyboardAware === next.keyboardAware &&
    previous.fullScreen === next.fullScreen &&
    previous.shouldScaleBackground === next.shouldScaleBackground &&
    previous.fullScreenBackgroundScale === next.fullScreenBackgroundScale &&
    previous.fullScreenDraggable === next.fullScreenDraggable &&
    previous.fullScreenCloseBehavior === next.fullScreenCloseBehavior &&
    previous.fullScreenTransition === next.fullScreenTransition &&
    previous.fullScreenSafeAreaTop === next.fullScreenSafeAreaTop &&
    previous.style === next.style &&
    previous.className === next.className &&
    previous.footerStyle === next.footerStyle &&
    previous.footerClassName === next.footerClassName);

const arePresentedTrayRegionPayloadsEquivalent = (
  region: PresentedTrayRegionName,
  previous: PresentedTrayRegionPayload,
  next: PresentedTrayRegionPayload,
) => {
  if (
    previous.rootTrayId !== next.rootTrayId ||
    previous.stepOptions === undefined ||
    !arePresentedTrayStepOptionsEquivalent(
      previous.stepOptions,
      next.stepOptions,
    )
  ) {
    return false;
  }

  if (region === "footer") {
    // The footer node is shared across steps in the common onboarding shape.
    // Its navigation hook observes the runtime store directly, so a new
    // step id or header/body node does not require rebuilding this wrapper.
    return previous.footer === next.footer;
  }

  return (
    previous.trayId === next.trayId &&
    previous.fullScreen === next.fullScreen &&
    previous.fullScreenBoundaryExit === next.fullScreenBoundaryExit &&
    previous.isFirstRender === next.isFirstRender &&
    (region === "header"
      ? previous.header === next.header
      : previous.content === next.content)
  );
};

// Each visual region has a different reconciliation boundary. Select the
// fields that can affect that region and preserve the selection object when
// those fields are unchanged. This keeps a stable footer from reconciling
// just because the step header/body payload changed.
const createPresentedTrayRegionSelector = (
  region: PresentedTrayRegionName,
) => {
  let previousPayload: PresentedTrayRegionPayload | null = null;
  let previousSelection: PresentedTrayRegionPayload | null = null;

  return (payload: PresentedTrayProps["payload"]) => {
    const nextPayload: PresentedTrayRegionPayload = {
      rootTrayId: payload.rootTrayId,
      trayId: payload.trayId,
      stepOptions: payload.stepOptions,
      header: region === "header" ? payload.header : null,
      content: region === "content" ? payload.content : null,
      footer: region === "footer" ? payload.footer : null,
      fullScreen: payload.fullScreen,
      fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
      isFirstRender: payload.isFirstRender,
    };

    if (
      previousPayload !== null &&
      previousSelection !== null &&
      arePresentedTrayRegionPayloadsEquivalent(
        region,
        previousPayload,
        nextPayload,
      )
    ) {
      return previousSelection;
    }

    previousPayload = nextPayload;
    previousSelection = nextPayload;
    return nextPayload;
  };
};

// Keep the shell-facing region elements stable while the latest committed
// payload flows through a small external store. This removes wrapper/context
// reconstruction from the presenter's hot path without changing the payload
// ordering used by Tray's render snapshot barrier.
const PresentedTrayRegion = ({
  store,
  region,
  assignmentId,
}: {
  store: PresentedTrayPayloadStore;
  region: PresentedTrayRegionName;
  assignmentId: number;
}) => {
  const selectRegion = useMemo(
    () => createPresentedTrayRegionSelector(region),
    [region],
  );
  const getRegionSnapshot = useCallback(
    () => selectRegion(store.getSnapshot()),
    [selectRegion, store],
  );
  const payload = useSyncExternalStore(
    store.subscribe,
    getRegionSnapshot,
    getRegionSnapshot,
  );

  let regionNode: React.ReactNode = null;

  if (region === "header" && payload.header) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepContent
            stepKey={
              payload.fullScreen ? "fullscreen-header" : "fixed-header"
            }
            scale={false}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
            skipEntering={payload.isFirstRender}
          >
            <TrayHeaderTransitionProvider
              value={{
                stepKey: payload.trayId,
                skipEntering: payload.isFirstRender,
                fullScreenBoundaryExit: payload.fullScreenBoundaryExit,
              }}
            >
              {payload.header}
            </TrayHeaderTransitionProvider>
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  if (region === "content" && payload.content != null) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          <TrayStepContent
            stepKey={payload.trayId}
            scale={payload.stepOptions.scale}
            anchorScaleToTop={payload.fullScreen}
            fullScreenBoundaryExit={payload.fullScreenBoundaryExit}
            skipEntering={payload.isFirstRender}
          >
            {payload.content}
          </TrayStepContent>
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  if (region === "footer" && payload.footer) {
    regionNode = (
      <TrayScopeProvider value={payload.rootTrayId}>
        <TrayStepOptionsProvider value={payload.stepOptions}>
          {payload.footer}
        </TrayStepOptionsProvider>
      </TrayScopeProvider>
    );
  }

  return profileTrayRegion(
    `tray-region:${payload.trayId}:${region}`,
    regionNode,
    {
      region,
      rootTrayId: payload.rootTrayId,
      trayId: payload.trayId,
      assignmentId,
    },
  );
};

// render one resolved payload through the animated shell and content layers
const PresentedTray = ({
  payload,
  assignmentId,
  prepared = false,
  onRequestClose,
  onCloseComplete,
  dismissKeyboardForTray,
}: PresentedTrayProps) => {
  const runtime = useTrayRuntimeStore();
  const transitionContract = payload.transitionContract;
  const payloadStoreRef = useRef<{
    assignmentId: number;
    prepared: boolean;
    store: PresentedTrayPayloadStore;
  } | null>(null);

  if (
    payloadStoreRef.current === null ||
    payloadStoreRef.current.assignmentId !== assignmentId ||
    payloadStoreRef.current.prepared !== prepared
  ) {
    payloadStoreRef.current = {
      assignmentId,
      prepared,
      store: createPresentedTrayPayloadStore(payload),
    };
  }

  const payloadStore = payloadStoreRef.current.store;

  // Publish after the host commit. Regions therefore never observe a payload
  // that the animated shell has not committed, which preserves close and
  // fullscreen transition ordering. Closing hosts intentionally retain their
  // last visible region payload; the Tray controller owns the close snapshot
  // and clears it when the native close lifecycle completes.
  useLayoutEffect(() => {
    if (payload.visible) {
      payloadStore.publish(payload);
    }
  }, [payload, payloadStore]);

  const hasHeader = Boolean(payload.header);
  const hasContent = payload.content != null;
  const hasFooter = Boolean(payload.footer);

  const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
    (
      _id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    ) => {
      logTrayProfilerCommit(
        `tray-host:${payload.trayId}`,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        {
          rootTrayId: payload.rootTrayId,
          trayId: payload.trayId,
          assignmentId,
          visible: payload.visible,
          interactive: payload.interactive,
        },
      );
      markTrayStepReactRenderStarted(
        payload.rootTrayId,
        payload.trayId,
        actualDuration,
        {
          phase,
          baseDurationMs: baseDuration,
          startTime,
          commitTime,
          transitionGeneration: transitionContract?.generation,
        },
      );
      if (payload.visible && transitionContract?.fullScreenChanged) {
        markTrayBoundaryReactRender(
          payload.rootTrayId,
          transitionContract,
          payload.trayId,
          {
            phase,
            actualDurationMs: actualDuration,
            baseDurationMs: baseDuration,
            profilerStartTimeMs: startTime,
            profilerCommitTimeMs: commitTime,
            profilerSpanMs: commitTime - startTime,
          },
        );
      }
    },
    [
      assignmentId,
      payload.interactive,
      payload.rootTrayId,
      payload.trayId,
      transitionContract,
      payload.visible,
    ],
  );

  const header = useMemo(
    () =>
      hasHeader ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="header"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasHeader, payloadStore],
  );
  const content = useMemo(
    () =>
      hasContent ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="content"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasContent, payloadStore],
  );
  const footer = useMemo(
    () =>
      hasFooter ? (
        <PresentedTrayRegion
          store={payloadStore}
          region="footer"
          assignmentId={assignmentId}
        />
      ) : null,
    [assignmentId, hasFooter, payloadStore],
  );
  const handleDismissKeyboard = useCallback(
    () => dismissKeyboardForTray(payload.rootTrayId),
    [dismissKeyboardForTray, payload.rootTrayId],
  );
  const handleRequestClose = useCallback(() => {
    if (payload.interactive) {
      onRequestClose();
    }
  }, [onRequestClose, payload.interactive]);
  const tray = (
    <Tray
      assignmentId={assignmentId}
      prepared={prepared}
      visible={payload.visible}
      interactive={payload.interactive}
      rootTrayId={payload.rootTrayId}
      content={content}
      header={header}
      footer={footer}
      onClose={handleRequestClose}
      onCloseComplete={prepared ? undefined : onCloseComplete}
      trayId={payload.trayId}
      keyboardAware={payload.keyboardAware ?? payload.stepOptions.keyboardAware}
      keyboardStickyCapable={payload.keyboardStickyCapable}
      fullScreenMotionCapable={payload.fullScreenMotionCapable}
      fullScreen={payload.fullScreen}
      fullScreenBackgroundScale={payload.fullScreenBackgroundScale}
      fullScreenSafeAreaTop={payload.fullScreenSafeAreaTop}
      fullScreenDraggable={payload.fullScreenDraggable}
      dismissible={payload.dismissible}
      transition={payload.transition}
      transitionContract={payload.transitionContract}
      transitionLifecycle={runtime.transitions}
      containerStyle={payload.containerStyle}
      className={payload.className}
      footerStyle={payload.footerStyle}
      footerClassName={payload.footerClassName}
      dismissKeyboard={handleDismissKeyboard}
    />
  );

  if (!isTrayInstrumentationEnabled()) {
    return tray;
  }

  return (
    <React.Profiler
      id={`tray-${assignmentId}`}
      onRender={handleProfileRender}
    >
      {tray}
    </React.Profiler>
  );
};

const arePresentedTrayPropsEqual = (
  previous: PresentedTrayProps,
  next: PresentedTrayProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.prepared === next.prepared &&
  previous.onRequestClose === next.onRequestClose &&
  previous.dismissKeyboardForTray === next.dismissKeyboardForTray &&
  arePresentedTraysEquivalent(previous.payload, next.payload);

const MemoizedPresentedTray = React.memo(
  PresentedTray,
  arePresentedTrayPropsEqual,
);

MemoizedPresentedTray.displayName = "PresentedTray";

export { MemoizedPresentedTray as PresentedTray };
