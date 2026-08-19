// Temporary diagnostic switch for the fullscreen-return investigation.
// Keep the gate here so we can capture the sequence without changing any
// animation, measurement, or footer behavior.
const DEBUG = true;

let sequence = 0;

export const log = (...args: any[]) => {
  if (DEBUG) {
    sequence += 1;
    console.log(`[ActionTray#${sequence} @${Date.now()}]`, ...args);
  }
};
