export const resolveActionTrayOpenTravel = (
  resolveClosedTranslateY: (
    nextFooterHeight?: number,
    nextContentHeight?: number,
  ) => number,
  footerHeight: number,
  contentHeight: number,
) => resolveClosedTranslateY(footerHeight, contentHeight);

export const resolveActionTrayCloseTravel = (
  resolveClosedTranslateY: () => number,
  currentTranslateY: number,
) => Math.max(resolveClosedTranslateY(), currentTranslateY);
