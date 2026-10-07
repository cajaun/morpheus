import { isTrayInstrumentationEnabled } from "./config";

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

// telemetry stays local because this is a debug aid not a product analytics channel
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

// high resolution time gives more useful comparisons between animation stages
// read a high resolution clock when the platform provides one
const now = () => globalThis.performance?.now?.() ?? Date.now();

// retain only the latest open timing summaries for inspection
const writeSummary = (summary: TrayOpenTimingSummary) => {
  const existing =
    ((globalThis as typeof globalThis & {
      __TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }).__TRAY_OPEN_TIMINGS__ ?? []);

  const nextSummaries = [...existing, summary].slice(-MAX_RECORDED_SUMMARIES);

  // bound retained samples so repeated manual testing does not grow global state
  (
    globalThis as typeof globalThis & {
      __TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }
  ).__TRAY_OPEN_TIMINGS__ = nextSummaries;
};

// create the mutable record for one tray open attempt
const createTrace = (rootTrayId: string): TrayOpenTrace => ({
  attemptId: nextAttemptId++,
  rootTrayId,
});

// reuse the current open record when later lifecycle marks arrive
const getOrCreateTrace = (rootTrayId: string) => {
  // later lifecycle marks should attach to the same attempt when possible
  const existing = tracesByTrayId.get(rootTrayId);

  if (existing) {
    return existing;
  }

  const nextTrace = createTrace(rootTrayId);
  tracesByTrayId.set(rootTrayId, nextTrace);
  return nextTrace;
};

// format optional durations without inventing a missing measurement
const formatDuration = (value?: number) =>
  value == null ? "n/a" : `${value.toFixed(1)}ms`;

// print the completed open timing breakdown for local diagnosis
const logSummary = (summary: TrayOpenTimingSummary) => {
  // console logging is the lowest friction place to inspect timing while iterating
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

// start an open trace at the user press boundary
export const markTrayTriggerPressed = (rootTrayId: string) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  // trigger press is the cleanest origin point for a new attempt
  const trace = createTrace(rootTrayId);
  trace.triggerPressedAt = now();
  tracesByTrayId.set(rootTrayId, trace);
};

// record when navigation requests the tray to open
export const markTrayOpenRequested = (rootTrayId: string) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId);
  trace.openRequestedAt = now();
};

// record when the visible open motion begins
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

// record when measurements allow the open motion to proceed
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

// close the trace after the open motion reports completion
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

  // only the finished stage can compute the full span breakdown
  writeSummary(summary);
  logSummary(summary);
  tracesByTrayId.delete(rootTrayId);
};
