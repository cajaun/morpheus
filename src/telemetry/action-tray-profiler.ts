import { isActionTrayInstrumentationEnabled } from "./config";

// log profiler commits only while the explicit development instrumentation flag is enabled
export const logActionTrayProfilerCommit = (
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  details?: Record<string, unknown>,
) => {
  if (!isActionTrayInstrumentationEnabled()) {
    return;
  }

  console.log("[ActionTrayProfiler]", {
    id,
    phase,
    actualDurationMs: Number(actualDuration.toFixed(2)),
    baseDurationMs: Number(baseDuration.toFixed(2)),
    startTime: Number(startTime.toFixed(2)),
    commitTime: Number(commitTime.toFixed(2)),
    ...details,
  });
};
