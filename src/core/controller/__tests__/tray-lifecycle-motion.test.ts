// how far a closing tray travels before it is fully off screen
import { describe, expect, it } from "@jest/globals";
import { HORIZONTAL_MARGIN, TRAY_FOOTER_PADDING_BOTTOM } from "../../constants";
import { EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT } from "../../animation/frame-style-params";
import {
  resolveOriginClosedTranslateY,
  resolveTrayCloseTravel,
} from "../tray-lifecycle-motion";

describe("resolveOriginClosedTranslateY", () => {
  it("clears the screen for a tray that sits on the safe area with a fixed footer", () => {
    // the recorded tray: 310pt of content, the fixed 106pt footer, on a 34pt safe area
    const travel = resolveOriginClosedTranslateY({
      contentHeight: 310,
      originTargetContentHeight: 310,
      hasFooter: true,
      safeAreaBottom: 34,
      fullScreenFooterOrigin: false,
    });

    expect(travel).toBe(310 + EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT + 34);
    // the sheet rule anchored at 8pt fell 26pt short of the safe area alone
    expect(travel - (310 + EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT + HORIZONTAL_MARGIN)).toBe(26);
  });

  it("uses the height the tray opened at, not a transient measurement", () => {
    expect(
      resolveOriginClosedTranslateY({
        contentHeight: 280,
        originTargetContentHeight: 310,
        hasFooter: true,
        safeAreaBottom: 34,
        fullScreenFooterOrigin: false,
      }),
    ).toBe(310 + EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT + 34);
    expect(
      resolveOriginClosedTranslateY({
        contentHeight: 280,
        originTargetContentHeight: 0,
        hasFooter: false,
        safeAreaBottom: 34,
        fullScreenFooterOrigin: false,
      }),
    ).toBe(280 + 34);
  });

  it("anchors a fullscreen-footer origin on the fixed footer edge", () => {
    expect(
      resolveOriginClosedTranslateY({
        contentHeight: 300,
        originTargetContentHeight: 300,
        hasFooter: true,
        safeAreaBottom: 34,
        fullScreenFooterOrigin: true,
      }),
    ).toBe(
      300 +
        EXPAND_FROM_TRIGGER_EXPANDED_FOOTER_HEIGHT +
        HORIZONTAL_MARGIN +
        TRAY_FOOTER_PADDING_BOTTOM,
    );
  });

  it("never travels less than a drag already moved the tray", () => {
    expect(resolveTrayCloseTravel(() => 450, 520)).toBe(520);
    expect(resolveTrayCloseTravel(() => 450, 260)).toBe(450);
  });
});
