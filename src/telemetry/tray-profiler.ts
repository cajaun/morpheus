import React from "react";
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

// Add a profiling boundary without changing the rendered tree when telemetry
// is disabled. Region boundaries are intentionally opt-in so production and
// normal development renders do not pay for extra Profiler fibers.
export const profileTrayRegion = (
  id: string,
  children: React.ReactNode,
  details?: Record<string, unknown>,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return children;
  }

  return React.createElement(
    React.Profiler,
    {
      id,
      onRender: (
        _id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      ) =>
        logTrayProfilerCommit(
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          details,
        ),
    },
    children,
  );
};
