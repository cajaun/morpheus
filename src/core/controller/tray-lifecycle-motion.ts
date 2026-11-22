// shell travel from the current presentation boundary
export const resolveTrayOpenTravel = (
  resolveClosedTranslateY: (
    nextFooterHeight?: number,
    nextContentHeight?: number,
  ) => number,
  footerHeight: number,
  contentHeight: number,
) => resolveClosedTranslateY(footerHeight, contentHeight);

// close travel covers at least the current shell offset
export const resolveTrayCloseTravel = (
  resolveClosedTranslateY: () => number,
  currentTranslateY: number,
) => Math.max(resolveClosedTranslateY(), currentTranslateY);
