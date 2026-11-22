import React from "react";
import { isTrayInstrumentationEnabled } from "./config";
import { recordTrayTelemetry } from "./tray-telemetry-buffer";

// log profiler commits while development instrumentation is on
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

  recordTrayTelemetry("TrayProfiler", {
    id,
    phase,
    actualDurationMs: Number(actualDuration.toFixed(2)),
    baseDurationMs: Number(baseDuration.toFixed(2)),
    startTime: Number(startTime.toFixed(2)),
    commitTime: Number(commitTime.toFixed(2)),
    ...details,
  });
};

// a profiling boundary that leaves the tree unchanged when telemetry is off
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
