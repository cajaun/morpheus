// keep diagnostic logging isolated so investigation does not change animation behavior
const DEBUG = true;

let sequence = 0;

// write ordered diagnostics while the timing investigation is enabled
export const log = (...args: any[]) => {
  if (DEBUG) {
    sequence += 1;
    console.log(`[ActionTray#${sequence} @${Date.now()}]`, ...args);
  }
};

// Worklet diagnostics must stay on the worklet console path. Passing the
// module logger through scheduleOnRN can make Worklets resolve it as a stale
// Metro worklet hash during a native transition.
export const logWorklet = (label: string, details?: unknown) => {
  "worklet";

  if (DEBUG) {
    console.log(`[ActionTray UI @${performance.now()}]`, label, details);
  }
};
