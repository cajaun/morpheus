// keep page movement rules testable without rendering the pager
export const PAGE_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
} as const;

export const clampPageIndex = (index: number, totalPages: number) => {
  if (totalPages <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, totalPages - 1));
};

export const isTrayPageInRenderWindow = (
  index: number,
  pageIndex: number,
  transitionFromIndex: number | null = null,
) => index === pageIndex || index === transitionFromIndex;
