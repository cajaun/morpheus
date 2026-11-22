// keep a requested step index inside the registered range
export const clampTrayStepIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, total - 1));
};
