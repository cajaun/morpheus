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

const now = () => globalThis.performance?.now?.() ?? Date.now();

const writeSummary = (summary: TrayOpenTimingSummary) => {
  const existing =
    ((globalThis as typeof globalThis & {
      __ACTION_TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }).__ACTION_TRAY_OPEN_TIMINGS__ ?? []);

  const nextSummaries = [...existing, summary].slice(-MAX_RECORDED_SUMMARIES);

  (
    globalThis as typeof globalThis & {
      __ACTION_TRAY_OPEN_TIMINGS__?: TrayOpenTimingSummary[];
    }
  ).__ACTION_TRAY_OPEN_TIMINGS__ = nextSummaries;
};

const createTrace = (rootTrayId: string): TrayOpenTrace => ({
  attemptId: nextAttemptId++,
  rootTrayId,
});

const getOrCreateTrace = (rootTrayId: string) => {
  const existing = tracesByTrayId.get(rootTrayId);

  if (existing) {
    return existing;
  }

  const nextTrace = createTrace(rootTrayId);
  tracesByTrayId.set(rootTrayId, nextTrace);
  return nextTrace;
};

const formatDuration = (value?: number) =>
  value == null ? "n/a" : `${value.toFixed(1)}ms`;

const logSummary = (summary: TrayOpenTimingSummary) => {
  console.log(
    [
      "[ActionTrayPerf]",
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

export const markTrayTriggerPressed = (rootTrayId: string) => {
  const trace = createTrace(rootTrayId);
  trace.triggerPressedAt = now();
  tracesByTrayId.set(rootTrayId, trace);
};

export const markTrayOpenRequested = (rootTrayId: string) => {
  const trace = getOrCreateTrace(rootTrayId);
  trace.openRequestedAt = now();
};

export const markTrayOpenStarted = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
  const trace = getOrCreateTrace(rootTrayId);
  trace.presentedTrayId = presentedTrayId;
  trace.openStartedAt = now();
};

export const markTrayReadyToOpen = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
  const trace = getOrCreateTrace(rootTrayId);
  trace.presentedTrayId = presentedTrayId;
  trace.readyToOpenAt = now();
};

export const markTrayOpenFinished = (
  rootTrayId: string,
  presentedTrayId?: string,
) => {
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

  writeSummary(summary);
  logSummary(summary);
  tracesByTrayId.delete(rootTrayId);
};
