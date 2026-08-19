import {
  BACKWARD_CONTENT_MOTION,
  FORWARD_CONTENT_MOTION,
  resolveActiveFullScreenBoundaryExit,
  resolveMorphEnteringScale,
  resolveMorphExitingScale,
  resolveTrayContentMotionDirection,
} from "../transition-motion-direction";
import {
  MORPH_ENTERING_SCALE,
  MORPH_EXITING_SCALE,
} from "../constants";
import type { TrayTransitionContract } from "../../runtime/types";

const transition = (
  direction: TrayTransitionContract["direction"],
  boundary: TrayTransitionContract["boundary"],
): TrayTransitionContract => ({
  generation: 1,
  reason: direction === "backward" ? "previousStep" : "nextStep",
  direction,
  boundary,
  from: null,
  to: null,
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: boundary !== "sheetToSheet",
  sharedRegions: [],
});

describe("resolveTrayContentMotionDirection", () => {
  it("only enables fullscreen exit policy for an active mode boundary", () => {
    expect(resolveActiveFullScreenBoundaryExit(true, false)).toBe(false);
    expect(resolveActiveFullScreenBoundaryExit(true, true)).toBe(true);
  });

  it("inverts regular content motion for a backward sheet transition", () => {
    expect(
      resolveTrayContentMotionDirection(
        transition("backward", "sheetToSheet"),
      ),
    ).toBe(BACKWARD_CONTENT_MOTION);
  });

  it("keeps the established motion for forward and fullscreen boundaries", () => {
    expect(
      resolveTrayContentMotionDirection(
        transition("forward", "sheetToSheet"),
      ),
    ).toBe(FORWARD_CONTENT_MOTION);
    expect(
      resolveTrayContentMotionDirection(
        transition("backward", "fullScreenToSheet"),
      ),
    ).toBe(FORWARD_CONTENT_MOTION);
  });

  it("mirrors the scale endpoints for incoming and outgoing backward content", () => {
    expect(
      resolveMorphEnteringScale({
        scale: true,
        synchronizedFullScreen: false,
        direction: BACKWARD_CONTENT_MOTION,
      }),
    ).toBe(MORPH_EXITING_SCALE);
    expect(
      resolveMorphExitingScale({
        scale: true,
        fullScreenBoundaryExit: false,
        direction: BACKWARD_CONTENT_MOTION,
      }),
    ).toBe(MORPH_ENTERING_SCALE);
  });

  it("does not alter fullscreen boundary scale policy", () => {
    expect(
      resolveMorphEnteringScale({
        scale: true,
        synchronizedFullScreen: true,
        direction: BACKWARD_CONTENT_MOTION,
      }),
    ).toBe(1);
    expect(
      resolveMorphExitingScale({
        scale: true,
        fullScreenBoundaryExit: true,
        direction: BACKWARD_CONTENT_MOTION,
      }),
    ).toBe(1);
  });
});
