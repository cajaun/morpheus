// fullscreen values stay within the intended geometry range
import { describe, expect, it } from "@jest/globals";
import {
  FULL_SCREEN_BOUNDARY_CONTENT_SCALE,
  FULL_SCREEN_CONTENT_EASING_POINTS,
  FULL_SCREEN_CONTENT_EXIT_EASING_POINTS,
  FULL_SCREEN_ENTERING_DURATION,
  FULL_SCREEN_EXITING_DURATION,
  FULL_SCREEN_LAYOUT_DURATION,
  FULL_SCREEN_SHELL_EASING_POINTS,
  MORPH_ENTERING_DURATION,
  SHEET_EASING_POINTS,
  MORPH_LAYOUT_DURATION,
} from "../constants";
import { BORDER_RADIUS, HORIZONTAL_MARGIN } from "../constants";

describe("fullscreen animation contract", () => {
  it("keeps the video-derived fullscreen timing and easing values", () => {
    expect(FULL_SCREEN_LAYOUT_DURATION).toBe(300);
    expect(FULL_SCREEN_SHELL_EASING_POINTS).toEqual([0.2, 0.3, 0.2, 1]);
    expect(FULL_SCREEN_CONTENT_EXIT_EASING_POINTS).toEqual([0, 0, 0.58, 1]);
    expect(FULL_SCREEN_ENTERING_DURATION).toBe(250);
    expect(FULL_SCREEN_CONTENT_EASING_POINTS).toEqual([
      0.42,
      0,
      0.58,
      1,
    ]);
    expect(FULL_SCREEN_EXITING_DURATION).toBe(180);
    expect(FULL_SCREEN_BOUNDARY_CONTENT_SCALE).toBe(1);
  });

  it("does not change regular step-to-step timing", () => {
    expect(MORPH_ENTERING_DURATION).toBe(280);
    expect(MORPH_LAYOUT_DURATION).toBe(300);
    expect(SHEET_EASING_POINTS).toEqual([0.4, 0.6, 0.15, 1]);
  });

  it("keeps the tray return geometry values", () => {
    expect(HORIZONTAL_MARGIN).toBe(8);
    expect(BORDER_RADIUS).toBe(40);
  });
});
