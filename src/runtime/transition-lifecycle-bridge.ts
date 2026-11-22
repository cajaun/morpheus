import type {
  TrayTransitionLifecycle,
  TrayTransitionPhase,
} from "./types";

type ReportParams = {
  lifecycle?: TrayTransitionLifecycle;
  generation: number | undefined;
  phase: Exclude<TrayTransitionPhase, "requested">;
  source: string;
  details?: Record<string, unknown>;
  at?: number;
};

// every phase report passes here so callers cannot report for a missing or replaced generation
export const reportTrayTransitionPhase = ({
  lifecycle,
  generation,
  phase,
  source,
  details,
  at,
}: ReportParams) => {
  if (generation === undefined || !lifecycle?.get(generation)) {
    return false;
  }

  return lifecycle.mark(
    generation,
    phase,
    {
      ...details,
      source,
    },
    at,
  );
};
