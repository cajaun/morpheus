export type TrayProfilerPhase = "mount" | "update" | "nested-update";

// profiler samples keep their own timestamps, lifecycle marks use the JS clock
export type TrayStepReactRender = {
  phase: TrayProfilerPhase;
  actualDurationMs: number;
  baseDurationMs: number;
  profilerStartTimeMs: number;
  profilerCommitTimeMs: number;
  profilerSpanMs: number;
};

export type TrayStepReactRenderSample = TrayStepReactRender & {
  observedAt: number;
};

// one step transition from request through layout finish
export type TrayStepTimingTrace = {
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
  // React render time before the animation started
  blockingReactRenderMs: number;
  // React commits during the animation
  reactCommitsDuringLayout: number;
  keyboardIntentAt?: number;
  keyboardFocusRequestedAt?: number;
  keyboardFocusAt?: number;
  keyboardWillShowAt?: number;
  keyboardGateWaitStartedAt?: number;
  keyboardGateOpenedAt?: number;
  keyboardGateOpenedBy?: number;
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
  blockingReactRenderMs: number;
  reactCommitsDuringLayout: number;
  keyboardIntentToFocusMs?: number;
  // time from the step commit to the input's focus() call
  renderedCommitToFocusRequestMs?: number;
  // time from focus() to the input's onFocus event
  focusRequestToFocusMs?: number;
  // what let a keyboard step's sheet start, gate timestamps use the UI clock so they stay out of the JS spans
  keyboardGateOpenedBy?: "keyboard-start" | "keyboard-progress" | "wait-limit";
  keyboardFocusToWillShowMs?: number;
  keyboardWillShowToLayoutStartMs?: number;
};

export const MAX_RECORDED_SUMMARIES = 50;

export const tracesByRootTrayId = new Map<string, TrayStepTimingTrace>();

export const rootTrayIdByPresentedTrayId = new Map<string, string>();

// generation of each root's last finished or replaced trace, a late mark from it cannot attach to the next trace
export const retiredGenerationByRootTrayId = new Map<string, number>();

export const retireTrace = (trace: TrayStepTimingTrace) => {
  if (trace.transitionGeneration === undefined) {
    return;
  }

  retiredGenerationByRootTrayId.set(
    trace.rootTrayId,
    trace.transitionGeneration,
  );
};

// one clock source for every step timing mark
export const now = () => globalThis.performance?.now?.() ?? Date.now();

export const round = (value: number) => Number(value.toFixed(2));

export const toRenderSummary = (
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

// a mark attaches to the request that owns it, a later generation never mutates an older trace
export const getTrace = (rootTrayId: string, transitionGeneration?: number) => {
  const trace = tracesByRootTrayId.get(rootTrayId);

  if (!trace) {
    return undefined;
  }

  const retiredGeneration = retiredGenerationByRootTrayId.get(rootTrayId);

  if (
    transitionGeneration !== undefined &&
    transitionGeneration === retiredGeneration
  ) {
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

export const setTraceTrayId = (trace: TrayStepTimingTrace, trayId: string) => {
  if (trace.trayId !== undefined && trace.trayId !== trayId) {
    return false;
  }

  trace.trayId = trayId;
  rootTrayIdByPresentedTrayId.set(trayId, trace.rootTrayId);
  return true;
};

// keep the latest step timing summaries
export const writeSummary = (summary: TrayStepTimingSummary) => {
  const timingGlobal = globalThis as typeof globalThis & {
    __TRAY_STEP_TIMINGS__?: TrayStepTimingSummary[];
  };
  const existing = timingGlobal.__TRAY_STEP_TIMINGS__ ?? [];

  timingGlobal.__TRAY_STEP_TIMINGS__ = [...existing, summary].slice(
    -MAX_RECORDED_SUMMARIES,
  );
};

// publish a summary once every required stage has a timestamp
export const tryFinishTrace = (rootTrayId: string) => {
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
    requestToPresenterResolvedMs: trace.presenterResolvedAt - trace.requestedAt,
    presenterResolvedToSlotStateCommitMs:
      trace.slotCommittedAt - trace.presenterResolvedAt,
    requestToSnapshotPublicationMs: trace.snapshotAt - trace.requestedAt,
    snapshotPublicationToRenderedCommitMs:
      trace.renderedCommitAt - trace.snapshotAt,
    renderedCommitToShellLayoutMs: trace.shellLayoutAt - trace.renderedCommitAt,
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
    layoutStartToFinishMs: trace.layoutFinishedAt - trace.layoutStartedAt,
    incomingReactRender: toRenderSummary(trace.incomingReactRender),
    snapshotReactRender: toRenderSummary(trace.snapshotReactRender),
    incomingReactRenderCount: trace.incomingReactRenderCount,
    snapshotReactRenderCount: trace.snapshotReactRenderCount,
    blockingReactRenderMs: round(trace.blockingReactRenderMs),
    reactCommitsDuringLayout: trace.reactCommitsDuringLayout,
    keyboardGateOpenedBy:
      trace.keyboardGateOpenedBy === 1
        ? "keyboard-start"
        : trace.keyboardGateOpenedBy === 2
          ? "keyboard-progress"
          : trace.keyboardGateOpenedBy === 3
            ? "wait-limit"
            : undefined,
    renderedCommitToFocusRequestMs:
      trace.keyboardFocusRequestedAt !== undefined
        ? trace.keyboardFocusRequestedAt - trace.renderedCommitAt
        : undefined,
    focusRequestToFocusMs:
      trace.keyboardFocusRequestedAt !== undefined &&
      trace.keyboardFocusAt !== undefined
        ? trace.keyboardFocusAt - trace.keyboardFocusRequestedAt
        : undefined,
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
  retireTrace(trace);
  tracesByRootTrayId.delete(rootTrayId);
  rootTrayIdByPresentedTrayId.delete(trace.trayId);

  console.log("[TrayStepPerf]", JSON.stringify(summary));
};

export const TRACE_STAGES = [
  "presenterResolvedAt",
  "slotCommittedAt",
  "snapshotAt",
  "renderedCommitAt",
  "shellLayoutAt",
  "layoutConfiguredAt",
  "layoutStartedAt",
  "contentReleasedAt",
  "layoutFinishedAt",
  "keyboardIntentAt",
  "keyboardFocusRequestedAt",
  "keyboardFocusAt",
  "keyboardWillShowAt",
] as const;

// log a replaced trace's recorded stages and missing ones so a skipped stage stays visible
export const logIncompleteTrace = (trace: TrayStepTimingTrace) => {
  const recorded: Record<string, number> = {};
  const missing: string[] = [];

  for (const stage of TRACE_STAGES) {
    const at = trace[stage];

    if (at === undefined) {
      missing.push(stage);
    } else {
      recorded[stage] = round(at - trace.requestedAt);
    }
  }

  if (trace.trayId !== undefined) {
    rootTrayIdByPresentedTrayId.delete(trace.trayId);
  }

  console.log(
    "[TrayStepPerf:incomplete]",
    JSON.stringify({
      rootTrayId: trace.rootTrayId,
      trayId: trace.trayId,
      transitionGeneration: trace.transitionGeneration,
      recordedMsAfterRequest: recorded,
      missing,
      blockingReactRenderMs: round(trace.blockingReactRenderMs),
      reactCommitsDuringLayout: trace.reactCommitsDuringLayout,
    }),
  );
};
