// keep diagnostic logging isolated so investigation does not change animation behavior
const DEBUG = false;

let sequence = 0;

// write ordered diagnostics while the timing investigation is enabled
export const log = (...args: any[]) => {
  if (DEBUG) {
    sequence += 1;
    console.log(`[ActionTray#${sequence} @${Date.now()}]`, ...args);
  }
};
