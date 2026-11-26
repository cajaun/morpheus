import {
  HORIZONTAL_MARGIN,
  TRAY_FOOTER_PADDING_BOTTOM,
} from "../constants";
import { EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT } from "../animation/frame-style-params";

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

// a tray that grew out of its trigger keeps trigger geometry, it sits on the safe area, or on the fixed footer edge for a fullscreen-footer origin, and reserves the fixed footer height, so it leaves the screen after its full height plus that anchor
export const resolveOriginClosedTranslateY = ({
  contentHeight,
  originTargetContentHeight,
  hasFooter,
  safeAreaBottom,
  fullScreenFooterOrigin,
}: {
  contentHeight: number;
  originTargetContentHeight: number;
  hasFooter: boolean;
  safeAreaBottom: number;
  fullScreenFooterOrigin: boolean;
}) => {
  const sheetContentHeight =
    originTargetContentHeight > 0 ? originTargetContentHeight : contentHeight;
  const footerHeight = hasFooter
    ? EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT
    : 0;
  const bottomAnchor = fullScreenFooterOrigin
    ? HORIZONTAL_MARGIN + TRAY_FOOTER_PADDING_BOTTOM
    : safeAreaBottom;

  return sheetContentHeight + footerHeight + bottomAnchor;
};
