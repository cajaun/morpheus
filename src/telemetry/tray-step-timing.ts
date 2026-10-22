import { isTrayInstrumentationEnabled } from "./config";

export type TrayProfilerPhase = "mount" | "update" | "nested-update";

// Keep profiler samples separate from the lifecycle clock. React's profiler
// timestamps describe a renderer sample, while the lifecycle marks below use
// the JS performance clock for cross-system ordering.
export type TrayStepReactRender = {
  phase: TrayProfilerPhase;
  actualDurationMs: number;
  baseDurationMs: number;
  profilerStartTimeMs: number;
  profilerCommitTimeMs: number;
  profilerSpanMs: number;
};

type TrayStepReactRenderSample = TrayStepReactRender & {
  observedAt: number;
};

// trace one step transition from request through layout finish
type TrayStepTimingTrace = {
  rootTrayId: string;
  trayId?: string;
  transitionGeneration?: number;
  requestedAt: number;
  presenterResolvedAt?: number;
  slotCommittedAt?: number;
  snapshotAt?: number;
  renderedCommitAt?: number;
  shellLayoutAt?: number;
  layoutConfiguredAt?: number;
  layoutStartedAt?: number;
  contentReleasedAt?: number;
  layoutFinishedAt?: number;
  incomingReactRender?: TrayStepReactRenderSample;
  snapshotReactRender?: TrayStepReactRenderSample;
  incomingReactRenderCount: number;
  snapshotReactRenderCount: number;
  keyboardIntentAt?: number;
  keyboardFocusAt?: number;
  keyboardWillShowAt?: number;
};

export type TrayStepTimingSummary = {
  rootTrayId: string;
  trayId: string;
  transitionGeneration?: number;
  requestToPresenterResolvedMs: number;
  presenterResolvedToSlotStateCommitMs: number;
  requestToSnapshotPublicationMs: number;
  snapshotPublicationToRenderedCommitMs: number;
  renderedCommitToShellLayoutMs: number;
  renderedCommitToLayoutConfiguredMs: number;
  layoutConfiguredToLayoutStartMs: number;
  renderedCommitToLayoutStartMs: number;
  snapshotToLayoutStartMs: number;
  requestToLayoutStartMs: number;
  layoutStartToContentReleaseMs: number;
  layoutStartToFinishMs: number;
  incomingReactRender?: TrayStepReactRender;
  snapshotReactRender?: TrayStepReactRender;
  incomingReactRenderCount: number;
  snapshotReactRenderCount: number;
  keyboardIntentToFocusMs?: number;
  keyboardFocusToWillShowMs?: number;
  keyboardWillShowToLayoutStartMs?: number;
};

const MAX_RECORDED_SUMMARIES = 50;
const tracesByRootTrayId = new Map<string, TrayStepTimingTrace>();
const rootTrayIdByPresentedTrayId = new Map<string, string>();

// read one clock source for every step timing mark
const now = () => globalThis.performance?.now?.() ?? Date.now();

const round = (value: number) => Number(value.toFixed(2));

const toRenderSummary = (
  sample: TrayStepReactRenderSample | undefined,
): TrayStepReactRender | undefined =>
  sample
    ? {
        phase: sample.phase,
        actualDurationMs: round(sample.actualDurationMs),
        baseDurationMs: round(sample.baseDurationMs),
        profilerStartTimeMs: round(sample.profilerStartTimeMs),
        profilerCommitTimeMs: round(sample.profilerCommitTimeMs),
        profilerSpanMs: round(sample.profilerSpanMs),
      }
    : undefined;

// Associate every mark with the request that owns it. A transition generation
// may only become available after navigation resolves, so the first mark may
// attach it lazily; a later generation must never mutate an older trace.
const getTrace = (rootTrayId: string, transitionGeneration?: number) => {
  const trace = tracesByRootTrayId.get(rootTrayId);

  if (!trace) {
    return undefined;
  }

  if (
    transitionGeneration !== undefined &&
    trace.transitionGeneration !== undefined &&
    trace.transitionGeneration !== transitionGeneration
  ) {
    return undefined;
  }

  if (
    transitionGeneration !== undefined &&
    trace.transitionGeneration === undefined
  ) {
    trace.transitionGeneration = transitionGeneration;
  }

  return trace;
};

const setTraceTrayId = (trace: TrayStepTimingTrace, trayId: string) => {
  if (trace.trayId !== undefined && trace.trayId !== trayId) {
    return false;
  }

  trace.trayId = trayId;
  rootTrayIdByPresentedTrayId.set(trayId, trace.rootTrayId);
  return true;
};

// retain only the latest step timing summaries for inspection
const writeSummary = (summary: TrayStepTimingSummary) => {
  const timingGlobal = globalThis as typeof globalThis & {
    __TRAY_STEP_TIMINGS__?: TrayStepTimingSummary[];
  };
  const existing = timingGlobal.__TRAY_STEP_TIMINGS__ ?? [];

  timingGlobal.__TRAY_STEP_TIMINGS__ = [
    ...existing,
    summary,
  ].slice(-MAX_RECORDED_SUMMARIES);
};

// publish a summary only after every required stage has a timestamp
const tryFinishTrace = (rootTrayId: string) => {
  const trace = tracesByRootTrayId.get(rootTrayId);

  if (
    !trace ||
    trace.trayId === undefined ||
    trace.presenterResolvedAt === undefined ||
    trace.slotCommittedAt === undefined ||
    trace.snapshotAt === undefined ||
    trace.renderedCommitAt === undefined ||
    trace.shellLayoutAt === undefined ||
    trace.layoutConfiguredAt === undefined ||
    trace.layoutStartedAt === undefined ||
    trace.contentReleasedAt === undefined ||
    trace.layoutFinishedAt === undefined
  ) {
    return;
  }

  const summary: TrayStepTimingSummary = {
    rootTrayId,
    trayId: trace.trayId,
    transitionGeneration: trace.transitionGeneration,
    requestToPresenterResolvedMs:
      trace.presenterResolvedAt - trace.requestedAt,
    presenterResolvedToSlotStateCommitMs:
      trace.slotCommittedAt - trace.presenterResolvedAt,
    requestToSnapshotPublicationMs: trace.snapshotAt - trace.requestedAt,
    snapshotPublicationToRenderedCommitMs:
      trace.renderedCommitAt - trace.snapshotAt,
    renderedCommitToShellLayoutMs:
      trace.shellLayoutAt - trace.renderedCommitAt,
    renderedCommitToLayoutConfiguredMs:
      trace.layoutConfiguredAt - trace.renderedCommitAt,
    layoutConfiguredToLayoutStartMs:
      trace.layoutStartedAt - trace.layoutConfiguredAt,
    renderedCommitToLayoutStartMs:
      trace.layoutStartedAt - trace.renderedCommitAt,
    snapshotToLayoutStartMs: trace.layoutStartedAt - trace.snapshotAt,
    requestToLayoutStartMs: trace.layoutStartedAt - trace.requestedAt,
    layoutStartToContentReleaseMs:
      trace.contentReleasedAt - trace.layoutStartedAt,
    layoutStartToFinishMs:
      trace.layoutFinishedAt - trace.layoutStartedAt,
    incomingReactRender: toRenderSummary(trace.incomingReactRender),
    snapshotReactRender: toRenderSummary(trace.snapshotReactRender),
    incomingReactRenderCount: trace.incomingReactRenderCount,
    snapshotReactRenderCount: trace.snapshotReactRenderCount,
    keyboardIntentToFocusMs:
      trace.keyboardIntentAt !== undefined &&
      trace.keyboardFocusAt !== undefined
        ? trace.keyboardFocusAt - trace.keyboardIntentAt
        : undefined,
    keyboardFocusToWillShowMs:
      trace.keyboardFocusAt !== undefined &&
      trace.keyboardWillShowAt !== undefined
        ? trace.keyboardWillShowAt - trace.keyboardFocusAt
        : undefined,
    keyboardWillShowToLayoutStartMs:
      trace.keyboardWillShowAt !== undefined
        ? trace.layoutStartedAt - trace.keyboardWillShowAt
        : undefined,
  };

  writeSummary(summary);
  tracesByRootTrayId.delete(rootTrayId);
  rootTrayIdByPresentedTrayId.delete(trace.trayId);

  console.log("[TrayStepPerf]", JSON.stringify(summary));
};

// record the first point where navigation knows the next step will need the keyboard
export const markTrayStepKeyboardIntent = (
  rootTrayId?: string | null,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardIntentAt === undefined) {
    trace.keyboardIntentAt = now();
  }
};

// record native input focus without logging every keyboard frame
export const markTrayStepKeyboardFocus = (
  rootTrayId?: string | null,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardFocusAt === undefined) {
    trace.keyboardFocusAt = now();
  }
};

// record the native keyboard animation boundary used by KeyboardStickyView
export const markTrayStepKeyboardWillShow = (
  rootTrayId?: string | null,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardWillShowAt === undefined) {
    trace.keyboardWillShowAt = now();
  }
};

// start a step trace at the navigation request boundary
export const markTrayStepRequested = (
  rootTrayId?: string,
  transitionGeneration?: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  tracesByRootTrayId.set(rootTrayId, {
    rootTrayId,
    transitionGeneration,
    requestedAt: now(),
    incomingReactRenderCount: 0,
    snapshotReactRenderCount: 0,
  });
};

// record when the render snapshot publication is requested. This is the state
// update boundary, not the React commit boundary; the latter is recorded by
// markTrayStepRenderedCommit.
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

// record when the presenter resolves the new step payload
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

// record when the host slot commits the resolved payload
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

// Record every presenter-owned React render. We classify the first render
// before snapshot publication as the incoming/staging render and the first
// render after publication as the committed snapshot render. The profiler's
// own timestamps stay inside the sample; observedAt is only used for this
// ordering decision and is never reported as React render start.
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

  if (
    trace.snapshotAt === undefined
  ) {
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

// record when native layout begins consuming the new geometry
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

// record when native layout accepts the transition configuration
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

// record when the shell reports its committed layout
export const markTrayStepShellLayout = (
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
    trace.shellLayoutAt === undefined
  ) {
    trace.shellLayoutAt = now();
  }
};

// record when native layout finishes and try to close the trace
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

// record when the rendered snapshot commits to the host tree
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

// record when incoming content releases its entering transition
export const markTrayStepContentReleased = (
  trayId: string,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const rootTrayId = rootTrayIdByPresentedTrayId.get(trayId);

  if (!rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.contentReleasedAt === undefined) {
    // The worklet timestamp has a different time origin from JS. This
    // callback is already scheduled on RN, so mark the observable release
    // boundary with the same clock used by the rest of this trace.
    trace.contentReleasedAt = now();
    tryFinishTrace(rootTrayId);
  }
};
