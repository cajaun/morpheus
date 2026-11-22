// diagnostic logging stays isolated so investigation never changes animation behaviour
const DEBUG = false;

let sequence = 0;

export const isTrayDebugLoggingEnabled = () => DEBUG;

// ordered diagnostics while the timing investigation is on
export const log = (...args: any[]) => {
  if (DEBUG) {
    sequence += 1;
    console.log(`[Tray#${sequence} @${Date.now()}]`, ...args);
  }
};

// worklet diagnostics use the worklet console, scheduling the module logger can resolve a stale Metro worklet hash
export const logWorklet = (label: string, details?: unknown) => {
  "worklet";

  if (DEBUG) {
    console.log(`[Tray UI @${performance.now()}]`, label, details);
  }
};
