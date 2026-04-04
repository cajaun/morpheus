const DEBUG = false

export const log = (...args: any[]) => {
  if (DEBUG) {
    console.log("[ActionTray]", ...args);
  }
};