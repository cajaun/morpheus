import { isActionTrayInstrumentationEnabled } from "./config";

// trace one step transition from request through layout finish
type TrayStepTimingTrace = {
  rootTrayId: string;
  trayId?: string;
  requestedAt: number;
  presenterResolvedAt?: number;
  slotCommittedAt?: number;
  snapshotAt?: number;
  reactRenderStartedAt?: number;
  reactActualDurationMs?: number;
  renderedCommitAt?: number;
  shellLayoutAt?: number;
  layoutConfiguredAt?: number;
  layoutStartedAt?: number;
  contentReleasedAt?: number;
  layoutFinishedAt?: number;
  keyboardIntentAt?: number;
  keyboardFocusAt?: number;
  keyboardWillShowAt?: number;
};

export type TrayStepTimingSummary = {
  rootTrayId: string;
  trayId: string;
  requestToPresenterResolvedMs: number;
  presenterResolvedToSlotCommitMs: number;
  slotCommitToSnapshotMs: number;
  requestToSnapshotMs: number;
  snapshotToReactRenderStartMs: number;
  reactRenderStartToRenderedCommitMs: number;
  reactActualDurationMs: number;
  snapshotToRenderedCommitMs: number;
  renderedCommitToShellLayoutMs: number;
  renderedCommitToLayoutConfiguredMs: number;
  layoutConfiguredToLayoutStartMs: number;
  renderedCommitToLayoutStartMs: number;
  snapshotToLayoutStartMs: number;
  requestToLayoutStartMs: number;
  layoutStartToContentReleaseMs: number;
  layoutStartToFinishMs: number;
  keyboardIntentToFocusMs?: number;
  keyboardFocusToWillShowMs?: number;
  keyboardWillShowToLayoutStartMs?: number;
};

const MAX_RECORDED_SUMMARIES = 50;
const tracesByRootTrayId = new Map<string, TrayStepTimingTrace>();
const rootTrayIdByPresentedTrayId = new Map<string, string>();

// read one clock source for every step timing mark
const now = () => globalThis.performance?.now?.() ?? Date.now();

// retain only the latest step timing summaries for inspection
const writeSummary = (summary: TrayStepTimingSummary) => {
  const timingGlobal = globalThis as typeof globalThis & {
    __ACTION_TRAY_STEP_TIMINGS__?: TrayStepTimingSummary[];
  };
  const existing = timingGlobal.__ACTION_TRAY_STEP_TIMINGS__ ?? [];

  timingGlobal.__ACTION_TRAY_STEP_TIMINGS__ = [
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
    trace.reactRenderStartedAt === undefined ||
    trace.reactActualDurationMs === undefined ||
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
    requestToPresenterResolvedMs:
      trace.presenterResolvedAt - trace.requestedAt,
    presenterResolvedToSlotCommitMs:
      trace.slotCommittedAt - trace.presenterResolvedAt,
    slotCommitToSnapshotMs: trace.snapshotAt - trace.slotCommittedAt,
    requestToSnapshotMs: trace.snapshotAt - trace.requestedAt,
    snapshotToReactRenderStartMs:
      trace.reactRenderStartedAt - trace.snapshotAt,
    reactRenderStartToRenderedCommitMs:
      trace.renderedCommitAt - trace.reactRenderStartedAt,
    reactActualDurationMs: trace.reactActualDurationMs,
    snapshotToRenderedCommitMs:
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

  console.log("[ActionTrayStepPerf]", {
    rootTrayId,
    trayId: trace.trayId,
    requestToPresenterResolvedMs: Number(
      summary.requestToPresenterResolvedMs.toFixed(2),
    ),
    presenterResolvedToSlotCommitMs: Number(
      summary.presenterResolvedToSlotCommitMs.toFixed(2),
    ),
    slotCommitToSnapshotMs: Number(
      summary.slotCommitToSnapshotMs.toFixed(2),
    ),
    requestToSnapshotMs: Number(summary.requestToSnapshotMs.toFixed(2)),
    snapshotToReactRenderStartMs: Number(
      summary.snapshotToReactRenderStartMs.toFixed(2),
    ),
    reactRenderStartToRenderedCommitMs: Number(
      summary.reactRenderStartToRenderedCommitMs.toFixed(2),
    ),
    reactActualDurationMs: Number(
      summary.reactActualDurationMs.toFixed(2),
    ),
    snapshotToRenderedCommitMs: Number(
      summary.snapshotToRenderedCommitMs.toFixed(2),
    ),
    renderedCommitToShellLayoutMs: Number(
      summary.renderedCommitToShellLayoutMs.toFixed(2),
    ),
    renderedCommitToLayoutConfiguredMs: Number(
      summary.renderedCommitToLayoutConfiguredMs.toFixed(2),
    ),
    layoutConfiguredToLayoutStartMs: Number(
      summary.layoutConfiguredToLayoutStartMs.toFixed(2),
    ),
    renderedCommitToLayoutStartMs: Number(
      summary.renderedCommitToLayoutStartMs.toFixed(2),
    ),
    snapshotToLayoutStartMs: Number(
      summary.snapshotToLayoutStartMs.toFixed(2),
    ),
    requestToLayoutStartMs: Number(
      summary.requestToLayoutStartMs.toFixed(2),
    ),
    layoutStartToContentReleaseMs: Number(
      summary.layoutStartToContentReleaseMs.toFixed(2),
    ),
    layoutStartToFinishMs: Number(
      summary.layoutStartToFinishMs.toFixed(2),
    ),
    keyboardIntentToFocusMs: summary.keyboardIntentToFocusMs,
    keyboardFocusToWillShowMs: summary.keyboardFocusToWillShowMs,
    keyboardWillShowToLayoutStartMs:
      summary.keyboardWillShowToLayoutStartMs,
  });
};

// record the first point where navigation knows the next step will need the keyboard
export const markTrayStepKeyboardIntent = (
  rootTrayId?: string | null,
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
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
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
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
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardWillShowAt === undefined) {
    trace.keyboardWillShowAt = now();
  }
};

// start a step trace at the navigation request boundary
export const markTrayStepRequested = (rootTrayId?: string) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  tracesByRootTrayId.set(rootTrayId, {
    rootTrayId,
    requestedAt: now(),
  });
};

// record when the render snapshot exposes the new step
export const markTrayStepSnapshotPublished = (
  rootTrayId?: string,
  trayId?: string,
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.snapshotAt === undefined) {
    trace.trayId = trayId;
    trace.snapshotAt = now();
    rootTrayIdByPresentedTrayId.set(trayId, rootTrayId);
  }
};

// record when the presenter resolves the new step payload
export const markTrayStepPresenterResolved = (rootTrayId?: string) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.presenterResolvedAt === undefined) {
    trace.presenterResolvedAt = now();
  }
};

// record when the host slot commits the resolved payload
export const markTrayStepSlotCommitted = (rootTrayId?: string) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.slotCommittedAt === undefined) {
    trace.slotCommittedAt = now();
  }
};

// record the react render start and measured render cost
export const markTrayStepReactRenderStarted = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  startedAt: number,
  actualDurationMs: number,
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (
    trace &&
    trace.trayId === trayId &&
    trace.reactRenderStartedAt === undefined
  ) {
    trace.reactRenderStartedAt = startedAt;
    trace.reactActualDurationMs = actualDurationMs;
  }
};

// record when native layout begins consuming the new geometry
export const markTrayStepLayoutStarted = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  startedAt: number,
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.layoutStartedAt === undefined) {
    trace.trayId = trayId;
    rootTrayIdByPresentedTrayId.set(trayId, rootTrayId);
    trace.layoutStartedAt = startedAt;
    tryFinishTrace(rootTrayId);
  }
};

// record when native layout accepts the transition configuration
export const markTrayStepLayoutConfigured = (
  rootTrayId: string | undefined,
  trayId: string | undefined,
  configuredAt: number,
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

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
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

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
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

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
) => {
  if (!isActionTrayInstrumentationEnabled() || !rootTrayId || !trayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

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
  releasedAt: number,
) => {
  if (!isActionTrayInstrumentationEnabled()) {
    return;
  }

  const rootTrayId = rootTrayIdByPresentedTrayId.get(trayId);

  if (!rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.contentReleasedAt === undefined) {
    trace.contentReleasedAt = releasedAt;
    tryFinishTrace(rootTrayId);
  }
};
