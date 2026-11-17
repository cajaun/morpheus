// In-memory sink for high-frequency diagnostics (per-commit profiler samples,
// per-step content markers). Writing these to the console during a transition
// costs JS-thread time and distorts the very profile being captured, so they
// are kept in a bounded ring buffer and exported in one call after capture:
//
//   globalThis.__TRAY_TELEMETRY__?.flush()
//
// Low-frequency summaries (one per transition) still log directly.
const MAX_RECORDED_EVENTS = 4096;

export type TrayTelemetryEvent = {
  tag: string;
  at: number;
  payload: Record<string, unknown>;
};

type TrayTelemetryBuffer = {
  events: TrayTelemetryEvent[];
  clear: () => void;
  flush: () => string;
};

const telemetryGlobal = globalThis as typeof globalThis & {
  __TRAY_TELEMETRY__?: TrayTelemetryBuffer;
};

const createBuffer = (): TrayTelemetryBuffer => ({
  events: [],
  clear() {
    this.events.length = 0;
  },
  flush() {
    const serialized = JSON.stringify(this.events);
    console.log("[TrayTelemetry]", serialized);
    this.events.length = 0;
    return serialized;
  },
});

const getBuffer = () => {
  if (telemetryGlobal.__TRAY_TELEMETRY__ === undefined) {
    telemetryGlobal.__TRAY_TELEMETRY__ = createBuffer();
  }

  return telemetryGlobal.__TRAY_TELEMETRY__;
};

// record one diagnostic event without touching the console
export const recordTrayTelemetry = (
  tag: string,
  payload: Record<string, unknown>,
) => {
  const buffer = getBuffer();

  buffer.events.push({
    tag,
    at: Number((globalThis.performance?.now?.() ?? Date.now()).toFixed(2)),
    payload,
  });

  if (buffer.events.length > MAX_RECORDED_EVENTS) {
    buffer.events.splice(0, buffer.events.length - MAX_RECORDED_EVENTS);
  }
};
