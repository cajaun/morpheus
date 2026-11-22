import { isTrayInstrumentationEnabled } from "./config";
import {
  tracesByRootTrayId,
  rootTrayIdByPresentedTrayId,
  retireTrace,
  now,
  getTrace,
  setTraceTrayId,
  tryFinishTrace,
  logIncompleteTrace,
  type TrayStepReactRenderSample,
  type TrayProfilerPhase,
} from "./step-timing/trace-store";
export {
  markTrayStepKeyboardIntent,
  markTrayStepKeyboardFocusRequested,
  markTrayStepKeyboardGate,
  markTrayStepKeyboardFocus,
  markTrayStepKeyboardWillShow,
} from "./step-timing/keyboard-marks";
export type {
  TrayProfilerPhase,
  TrayStepReactRender,
  TrayStepTimingSummary,
} from "./step-timing/trace-store";

// start a step trace at the navigation request
export const markTrayStepRequested = (
  rootTrayId?: string,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const unfinished = tracesByRootTrayId.get(rootTrayId);

  if (unfinished) {
    logIncompleteTrace(unfinished);
    retireTrace(unfinished);
  }

  tracesByRootTrayId.set(rootTrayId, {
    rootTrayId,
    transitionGeneration,
    requestedAt: now(),
    incomingReactRenderCount: 0,
    blockingReactRenderMs: 0,
    reactCommitsDuringLayout: 0,
    snapshotReactRenderCount: 0,
  });
};

// snapshot publication request, the React commit is markTrayStepRenderedCommit
export const markTrayStepSnapshotPublished = (
  rootTrayId?: string,
  trayId?: string,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    trace.snapshotAt === undefined &&
    setTraceTrayId(trace, trayId)
  ) {
    trace.snapshotAt = now();
  }
};

// the presenter resolves the new step payload
export const markTrayStepPresenterResolved = (
  rootTrayId?: string,
  transitionGeneration?: number,
  trayId?: string,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    (trayId === undefined || setTraceTrayId(trace, trayId)) &&
    trace.presenterResolvedAt === undefined
  ) {
    trace.presenterResolvedAt = now();
  }
};

// the host slot commits the resolved payload
export const markTrayStepSlotCommitted = (
  rootTrayId?: string,
  transitionGeneration?: number,
  trayId?: string,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    (trayId === undefined || setTraceTrayId(trace, trayId)) &&
    trace.slotCommittedAt === undefined
  ) {
    trace.slotCommittedAt = now();
  }
};

// classify presenter renders around snapshot publication, observedAt orders them and is never reported
export const markTrayStepReactRenderStarted = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  actualDurationMs: number,
  details?: {
    phase?: TrayProfilerPhase;
    baseDurationMs?: number;
    startTime?: number;
    commitTime?: number;
    transitionGeneration?: number;
  },
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const observedAt = now();
  const trace = getTrace(rootTrayId, details?.transitionGeneration);

  if (!trace || !setTraceTrayId(trace, trayId)) {
    return;
  }

  const profilerStartTime = details?.startTime ?? observedAt;
  const profilerCommitTime = details?.commitTime ?? observedAt;
  const sample: TrayStepReactRenderSample = {
    phase: details?.phase ?? "update",
    actualDurationMs,
    baseDurationMs: details?.baseDurationMs ?? actualDurationMs,
    profilerStartTimeMs: profilerStartTime,
    profilerCommitTimeMs: profilerCommitTime,
    profilerSpanMs: profilerCommitTime - profilerStartTime,
    observedAt,
  };

  if (trace.layoutStartedAt === undefined) {
    trace.blockingReactRenderMs += actualDurationMs;
  } else if (trace.layoutFinishedAt === undefined) {
    trace.reactCommitsDuringLayout += 1;
  }

  if (trace.snapshotAt === undefined) {
    trace.incomingReactRenderCount += 1;
    if (trace.incomingReactRender === undefined) {
      trace.incomingReactRender = sample;
    }
  } else {
    trace.snapshotReactRenderCount += 1;
    if (trace.snapshotReactRender === undefined) {
      trace.snapshotReactRender = sample;
    }
  }

  tryFinishTrace(rootTrayId);
};

// native layout starts consuming the new geometry
export const markTrayStepLayoutStarted = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  startedAt: number,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    trace.layoutStartedAt === undefined &&
    setTraceTrayId(trace, trayId)
  ) {
    trace.layoutStartedAt = startedAt;
    tryFinishTrace(rootTrayId);
  }
};

// native layout accepts the transition configuration
export const markTrayStepLayoutConfigured = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  configuredAt: number,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    trace.trayId === trayId &&
    trace.layoutConfiguredAt === undefined
  ) {
    trace.layoutConfiguredAt = configuredAt;
  }
};

// the shell reports its committed layout
export const markTrayStepShellLayout = (
  rootTrayId?: string,
  trayId?: string,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (trace && trace.trayId === trayId && trace.shellLayoutAt === undefined) {
    trace.shellLayoutAt = now();
  }
};

// native layout finishes, try to close the trace
export const markTrayStepLayoutFinished = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  finishedAt: number,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    trace.trayId === trayId &&
    trace.layoutFinishedAt === undefined
  ) {
    trace.layoutFinishedAt = finishedAt;
    tryFinishTrace(rootTrayId);
  }
};

// the rendered snapshot commits to the host tree
export const markTrayStepRenderedCommit = (
  rootTrayId?: string,
  trayId?: string,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = getTrace(rootTrayId, transitionGeneration);

  if (
    trace &&
    trace.trayId === trayId &&
    trace.renderedCommitAt === undefined
  ) {
    trace.renderedCommitAt = now();
    tryFinishTrace(rootTrayId);
  }
};

// incoming content releases its entering transition
export const markTrayStepContentReleased = (trayId: string) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const rootTrayId = rootTrayIdByPresentedTrayId.get(trayId);

  if (!rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.contentReleasedAt === undefined) {
    // the worklet timestamp has another time origin, so mark the release on this trace's JS clock
    trace.contentReleasedAt = now();
    tryFinishTrace(rootTrayId);
  }
};
