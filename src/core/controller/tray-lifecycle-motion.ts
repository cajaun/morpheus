// derive shell travel from the current presentation boundary
export const resolveTrayOpenTravel = (
  resolveClosedTranslateY: (
    nextFooterHeight?: number,
    nextContentHeight?: number,
  ) => number,
  footerHeight: number,
  contentHeight: number,
) => resolveClosedTranslateY(footerHeight, contentHeight);

// keep close travel at least as large as the current shell offset
export const resolveTrayCloseTravel = (
  resolveClosedTranslateY: () => number,
  currentTranslateY: number,
) => Math.max(resolveClosedTranslateY(), currentTranslateY);
