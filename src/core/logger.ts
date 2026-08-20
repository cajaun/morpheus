// keep diagnostic logging isolated so investigation does not change animation behavior
const DEBUG = true;

let sequence = 0;

export const log = (...args: any[]) => {
  if (DEBUG) {
    sequence += 1;
    console.log(`[ActionTray#${sequence} @${Date.now()}]`, ...args);
  }
};
