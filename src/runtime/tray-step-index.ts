// step index clamping is shared by navigation and registry reconciliation
export const clampTrayStepIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};
