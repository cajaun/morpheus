import { describe, expect, it } from "@jest/globals";
import { resolveSettledTitleStartWidth } from "../tray-step-content";

// The centered title slides from the width on screen to the new title's
// width. Its source width must never carry over from an older transition.
describe("resolveSettledTitleStartWidth", () => {
  it("adopts the on-screen width once a transition settles", () => {
    // One (120) -> Three (130) finished: source becomes 130, not 120
    expect(resolveSettledTitleStartWidth(1, 0.9, 120, 130)).toBe(130);
  });

  it("adopts the on-screen width when the clock restarts for a new step", () => {
    // Three -> Two starts: before Two is measured, start == end == 130,
    // so the title holds still instead of jumping toward 120's offset
    expect(resolveSettledTitleStartWidth(0, 1, 120, 130)).toBe(130);
  });

  it("keeps the measured source width while a transition is running", () => {
    // Two measured mid-transition: onLayout set start 130, width 110
    expect(resolveSettledTitleStartWidth(0.4, 0.3, 130, 110)).toBe(130);
  });

  it("leaves the first sample alone", () => {
    expect(resolveSettledTitleStartWidth(0, null, 0, 0)).toBe(0);
  });
});
