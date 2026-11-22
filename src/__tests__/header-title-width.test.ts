import { describe, expect, it } from "@jest/globals";
import { resolveSettledTitleStartWidth } from "../tray-step-content";

// the title slides from the on-screen width to the new title's width, never from an older transition's width
describe("resolveSettledTitleStartWidth", () => {
  it("adopts the on-screen width once a transition settles", () => {
    // One (120) to Three (130) finished, the source becomes 130
    expect(resolveSettledTitleStartWidth(1, 0.9, 120, 130)).toBe(130);
  });

  it("adopts the on-screen width when the clock restarts for a new step", () => {
    // Three to Two starts before Two measures, start and end are 130 so the title holds still
    expect(resolveSettledTitleStartWidth(0, 1, 120, 130)).toBe(130);
  });

  it("slides from the previous frame's width when the new title arrives with the reset", () => {
    // Two (157) to Three (177), the clock reset and Three's width land together and the source stays the on-screen 157
    expect(resolveSettledTitleStartWidth(0, 1, 177, 177, 157)).toBe(157);
  });

  it("keeps the measured source width while a transition is running", () => {
    // Two measured mid-transition, onLayout set start 130 and width 110
    expect(resolveSettledTitleStartWidth(0.4, 0.3, 130, 110)).toBe(130);
  });

  it("leaves the first sample alone", () => {
    expect(resolveSettledTitleStartWidth(0, null, 0, 0)).toBe(0);
  });
});
