// one debug gate keeps logging available without threading flags through hooks
const DEBUG = false

export const log = (...args: any[]) => {
  if (DEBUG) {
    console.log("[ActionTray]", ...args);
  }
};
