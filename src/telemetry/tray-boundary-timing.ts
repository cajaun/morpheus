import type { TrayTransitionContract } from "../runtime/types";
import { isTrayInstrumentationEnabled } from "./config";

type BoundaryRenderSample = {
  phase: "mount" | "update" | "nested-update";
  actualDurationMs: number;
  baseDurationMs: number;
  profilerStartTimeMs: number;
  profilerCommitTimeMs: number;
  profilerSpanMs: number;
};

type BoundaryTimingTrace = {
  rootTrayId: string;
  trayId?: string;
  generation: number;
  fromMode?: string;
  toMode?: string;
  requestedAt?: number;
  presenterResolvedAt?: number;
  slotCommittedAt?: number;
  snapshotPublishedAt?: number;
  renderedCommitAt?: number;
  shellLayoutAt?: number;
  layoutConfiguredAt?: number;
  layoutStartedAt?: number;
  layoutFinishedAt?: number;
  reactRender?: BoundaryRenderSample;
};

export type TrayBoundaryTimingSummary = {
  rootTrayId: string;
  trayId: string;
  generation: number;
  fromMode?: string;
  toMode?: string;
  requestToPresenterResolvedMs?: number;
  requestToSlotCommittedMs?: number;
  requestToSnapshotPublicationMs?: number;
  snapshotPublicationToRenderedCommitMs?: number;
  requestToRenderedCommitMs?: number;
  renderedCommitToShellLayoutMs?: number;
  renderedCommitToLayoutConfiguredMs?: number;
  renderedCommitToLayoutStartMs?: number;
  requestToLayoutStartMs?: number;
  layoutStartToFinishMs?: number;
  reactRender?: BoundaryRenderSample;
};

const MAX_RECORDED_SUMMARIES = 50;
const traces = new Map<string, BoundaryTimingTrace>();

const now = () => globalThis.performance?.now?.() ?? Date.now();
const round = (value: number) => Number(value.toFixed(2));
const keyFor = (rootTrayId: string, generation: number) =>
  `${rootTrayId}:${generation}`;

const writeSummary = (summary: TrayBoundaryTimingSummary) => {
  const timingGlobal = globalThis as typeof globalThis & {
    __TRAY_BOUNDARY_TIMINGS__?: TrayBoundaryTimingSummary[];
  };
  const existing = timingGlobal.__TRAY_BOUNDARY_TIMINGS__ ?? [];

  timingGlobal.__TRAY_BOUNDARY_TIMINGS__ = [
    ...existing,
    summary,
  ].slice(-MAX_RECORDED_SUMMARIES);

  console.log("[TrayBoundaryPerf]", JSON.stringify(summary));
};

const isBoundary = (contract?: TrayTransitionContract | null) =>
  contract?.fullScreenChanged === true;

const getOrCreateTrace = (
  rootTrayId: string,
  contract: TrayTransitionContract,
) => {
  if (!isBoundary(contract)) {
    return undefined;
  }

  const key = keyFor(rootTrayId, contract.generation);
  const existing = traces.get(key);

  if (existing) {
    return existing;
  }

  const trace: BoundaryTimingTrace = {
    rootTrayId,
    generation: contract.generation,
    fromMode: contract.from?.mode,
    toMode: contract.to?.mode,
  };
  traces.set(key, trace);
  return trace;
};

const setObservedAt = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  field: keyof Pick<
    BoundaryTimingTrace,
    | "presenterResolvedAt"
    | "slotCommittedAt"
    | "snapshotPublishedAt"
    | "renderedCommitAt"
    | "shellLayoutAt"
    | "layoutConfiguredAt"
    | "layoutStartedAt"
    | "layoutFinishedAt"
  >,
  trayId?: string,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !contract) {
    return undefined;
  }

  const trace = getOrCreateTrace(rootTrayId, contract);

  if (!trace) {
    return undefined;
  }

  trace[field] ??= now();
  trace.trayId ??= trayId;
  return trace;
};

export const markTrayBoundaryRequested = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !contract) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId, contract);

  if (trace) {
    trace.requestedAt ??= now();
  }
};

export const markTrayBoundaryPresenterResolved = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId?: string,
) => {
  setObservedAt(rootTrayId, contract, "presenterResolvedAt", trayId);
};

export const markTrayBoundarySlotCommitted = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId?: string,
) => {
  setObservedAt(rootTrayId, contract, "slotCommittedAt", trayId);
};

export const markTrayBoundarySnapshotPublished = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId?: string,
) => {
  setObservedAt(rootTrayId, contract, "snapshotPublishedAt", trayId);
};

// the rendered snapshot commit boundary, the older export stays for existing callers
export const markTrayBoundarySnapshotCommitted =
  markTrayBoundarySnapshotPublished;

export const markTrayBoundaryRenderedCommit = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId?: string,
) => {
  setObservedAt(rootTrayId, contract, "renderedCommitAt", trayId);
};

export const markTrayBoundaryShellLayout = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId?: string,
) => {
  setObservedAt(rootTrayId, contract, "shellLayoutAt", trayId);
};

export const markTrayBoundaryLayoutConfigured = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
) => {
  setObservedAt(rootTrayId, contract, "layoutConfiguredAt");
};

export const markTrayBoundaryLayoutStarted = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
) => {
  setObservedAt(rootTrayId, contract, "layoutStartedAt");
};

export const markTrayBoundaryLayoutFinished = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
) => {
  const trace = setObservedAt(
    rootTrayId,
    contract,
    "layoutFinishedAt",
  );

  if (
    !trace ||
    trace.trayId === undefined ||
    trace.layoutStartedAt === undefined
  ) {
    return;
  }

  const requestedAt = trace.requestedAt;
  const renderedCommitAt = trace.renderedCommitAt;
  const shellLayoutAt = trace.shellLayoutAt;
  const layoutConfiguredAt = trace.layoutConfiguredAt;

  const summary: TrayBoundaryTimingSummary = {
    rootTrayId: trace.rootTrayId,
    trayId: trace.trayId,
    generation: trace.generation,
    fromMode: trace.fromMode,
    toMode: trace.toMode,
    requestToPresenterResolvedMs:
      requestedAt !== undefined && trace.presenterResolvedAt !== undefined
        ? round(trace.presenterResolvedAt - requestedAt)
        : undefined,
    requestToSlotCommittedMs:
      requestedAt !== undefined && trace.slotCommittedAt !== undefined
        ? round(trace.slotCommittedAt - requestedAt)
        : undefined,
    requestToSnapshotPublicationMs:
      requestedAt !== undefined && trace.snapshotPublishedAt !== undefined
        ? round(trace.snapshotPublishedAt - requestedAt)
        : undefined,
    snapshotPublicationToRenderedCommitMs:
      renderedCommitAt !== undefined &&
      trace.snapshotPublishedAt !== undefined
        ? round(Math.max(0, renderedCommitAt - trace.snapshotPublishedAt))
        : undefined,
    requestToRenderedCommitMs:
      requestedAt !== undefined && renderedCommitAt !== undefined
        ? round(renderedCommitAt - requestedAt)
        : undefined,
    renderedCommitToShellLayoutMs:
      renderedCommitAt !== undefined && shellLayoutAt !== undefined
        ? round(shellLayoutAt - renderedCommitAt)
        : undefined,
    renderedCommitToLayoutConfiguredMs:
      renderedCommitAt !== undefined && layoutConfiguredAt !== undefined
        ? round(layoutConfiguredAt - renderedCommitAt)
        : undefined,
    renderedCommitToLayoutStartMs:
      renderedCommitAt !== undefined
        ? round(trace.layoutStartedAt - renderedCommitAt)
        : undefined,
    requestToLayoutStartMs:
      requestedAt !== undefined
        ? round(trace.layoutStartedAt - requestedAt)
        : undefined,
    layoutStartToFinishMs: round(
      trace.layoutFinishedAt! - trace.layoutStartedAt,
    ),
    reactRender: trace.reactRender,
  };

  writeSummary(summary);
  traces.delete(keyFor(trace.rootTrayId, trace.generation));
};

export const markTrayBoundaryReactRender = (
  rootTrayId: string | undefined,
  contract: TrayTransitionContract | null | undefined,
  trayId: string | undefined,
  sample: BoundaryRenderSample,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId || !contract) {
    return;
  }

  const trace = getOrCreateTrace(rootTrayId, contract);

  if (
    !trace ||
    (trace.trayId !== undefined && trace.trayId !== trayId)
  ) {
    return;
  }

  trace.trayId ??= trayId;

  if (
    trace.reactRender === undefined ||
    sample.actualDurationMs > trace.reactRender.actualDurationMs
  ) {
    trace.reactRender = {
      ...sample,
      actualDurationMs: round(sample.actualDurationMs),
      baseDurationMs: round(sample.baseDurationMs),
      profilerStartTimeMs: round(sample.profilerStartTimeMs),
      profilerCommitTimeMs: round(sample.profilerCommitTimeMs),
      profilerSpanMs: round(sample.profilerSpanMs),
    };
  }
};
