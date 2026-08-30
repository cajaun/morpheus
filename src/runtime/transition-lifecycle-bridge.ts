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

// all lifecycle phase reports pass through this boundary so callers cannot accidentally report a phase for a missing or already-replaced generation
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
