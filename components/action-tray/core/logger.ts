const DEBUG = true

export const log = (...args: any[]) => {
  if (DEBUG) {
    console.log("[ActionTray]", ...args);
  }
};