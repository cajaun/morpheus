// step index clamping is shared by navigation and registry reconciliation
// keep a requested step index inside the registered step range
export const clampTrayStepIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};
