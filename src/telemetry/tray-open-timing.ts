import { isTrayInstrumentationEnabled } from "./config";
import { logTrayEffectsBetween } from "./tray-layout-effect-profiler";

type TrayOpenTrace = {
  attemptId: number;
  rootTrayId: string;
  presentedTrayId?: string;
  triggerPressedAt?: number;
  openRequestedAt?: number;
  openStartedAt?: number;
  readyToOpenAt?: number;
  openFinishedAt?: number;
};

// a local debug aid, no product analytics
type TrayOpenTimingSummary = {
  attemptId: number;
  rootTrayId: string;
  presentedTrayId?: string;
  totalFromTriggerMs?: number;
  totalFromRequestMs: number;
  triggerToRequestMs?: number;
  requestToOpenStartMs?: number;
  openStartToReadyMs?: number;
  readyToFinishMs?: number;
};

const MAX_RECORDED_SUMMARIES = 25;

let nextAttemptId = 1;
const tracesByTrayId = new Map<string, TrayOpenTrace>();

// a high-resolution clock when the platform provides one
const now = () => globalThis.performance?.now?.() ?? Date.now();

// keep the latest open timing summaries
const writeSummary = (summary: TrayOpenTimingSummary) => {
  const existing =
    ((globalThis as typeof globalThis & {
      __TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }).__TRAY_OPEN_TIMINGS__ ?? []);

  const nextSummaries = [...existing, summary].slice(-MAX_RECORDED_SUMMARIES);

  // bound retained samples so repeated testing keeps global state small
  (
    globalThis as typeof globalThis & {
      __TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }
  ).__TRAY_OPEN_TIMINGS__ = nextSummaries;
};

// the mutable record of one open attempt
const createTrace = (rootTrayId: string): TrayOpenTrace => ({
  attemptId: nextAttemptId++,
  rootTrayId,
});

// reuse the current open record for later lifecycle marks
const getOrCreateTrace = (rootTrayId: string) => {
  // later lifecycle marks attach to the same attempt
  const existing = tracesByTrayId.get(rootTrayId);

  if (existing) {
    return existing;
  }

  const nextTrace = createTrace(rootTrayId);
  tracesByTrayId.set(rootTrayId, nextTrace);
  return nextTrace;
};

// format optional durations without inventing a measurement
const formatDuration = (value?: number) =>
  value == null ? "n/a" : `${value.toFixed(1)}ms`;

// print the completed open timing breakdown
const logSummary = (summary: TrayOpenTimingSummary) => {
  console.log(
    [
      "[TrayPerf]",
      `open "${summary.rootTrayId}"`,
      `attempt=${summary.attemptId}`,
      `total(trigger->open)=${formatDuration(summary.totalFromTriggerMs)}`,
      `total(request->open)=${formatDuration(summary.totalFromRequestMs)}`,
      `trigger->request=${formatDuration(summary.triggerToRequestMs)}`,
      `request->start=${formatDuration(summary.requestToOpenStartMs)}`,
      `start->ready=${formatDuration(summary.openStartToReadyMs)}`,
      `ready->finish=${formatDuration(summary.readyToFinishMs)}`,
      summary.presentedTrayId
        ? `presented="${summary.presentedTrayId}"`
        : undefined,
    ]
      .filter(Boolean)
      .join(" "),
  );
};

// start an open trace at the press
export const markTrayTriggerPressed = (rootTrayId: string) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  // the trigger press starts a new attempt
  const trace = createTrace(rootTrayId);
  trace.triggerPressedAt = now();
  tracesByTrayId.set(rootTrayId, trace);
};

// navigation requests the open
export const markTrayOpenRequested = (rootTrayId: string) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId);
  trace.openRequestedAt = now();
};

// the visible open motion begins
export const markTrayOpenStarted = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId);
  trace.presentedTrayId = presentedTrayId;
  trace.openStartedAt = now();
};

// measurements allow the open motion
export const markTrayReadyToOpen = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId);
  trace.presentedTrayId = presentedTrayId;
  trace.readyToOpenAt = now();
};

// close the trace when the open motion completes
export const markTrayOpenFinished = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId);
  const finishedAt = now();
  trace.presentedTrayId = presentedTrayId;
  trace.openFinishedAt = finishedAt;

  const summary: TrayOpenTimingSummary = {
    attemptId: trace.attemptId,
    rootTrayId: trace.rootTrayId,
    presentedTrayId: trace.presentedTrayId,
    totalFromTriggerMs:
      trace.triggerPressedAt != null
        ? finishedAt - trace.triggerPressedAt
        : undefined,
    totalFromRequestMs:
      finishedAt - (trace.openRequestedAt ?? trace.triggerPressedAt ?? finishedAt),
    triggerToRequestMs:
      trace.triggerPressedAt != null && trace.openRequestedAt != null
        ? trace.openRequestedAt - trace.triggerPressedAt
        : undefined,
    requestToOpenStartMs:
      trace.openRequestedAt != null && trace.openStartedAt != null
        ? trace.openStartedAt - trace.openRequestedAt
        : undefined,
    openStartToReadyMs:
      trace.openStartedAt != null && trace.readyToOpenAt != null
        ? trace.readyToOpenAt - trace.openStartedAt
        : undefined,
    readyToFinishMs:
      trace.readyToOpenAt != null
        ? finishedAt - trace.readyToOpenAt
        : trace.openStartedAt != null
          ? finishedAt - trace.openStartedAt
          : undefined,
  };

  // the finished stage computes the full span breakdown
  writeSummary(summary);
  logSummary(summary);
  // the effects between the press and the open becoming ready are the wait before any motion
  logTrayEffectsBetween(
    `open "${trace.rootTrayId}" attempt=${trace.attemptId} press->ready`,
    trace.triggerPressedAt ?? trace.openRequestedAt ?? finishedAt,
    trace.readyToOpenAt ?? finishedAt,
  );
  tracesByTrayId.delete(rootTrayId);
};
