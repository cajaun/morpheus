import { isTrayInstrumentationEnabled } from "./config";

// log profiler commits only while the explicit development instrumentation flag is enabled
export const logTrayProfilerCommit = (
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  details?: Record<string, unknown>,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  console.log("[TrayProfiler]", {
    id,
    phase,
    actualDurationMs: Number(actualDuration.toFixed(2)),
    baseDurationMs: Number(baseDuration.toFixed(2)),
    startTime: Number(startTime.toFixed(2)),
    commitTime: Number(commitTime.toFixed(2)),
    ...details,
  });
};
