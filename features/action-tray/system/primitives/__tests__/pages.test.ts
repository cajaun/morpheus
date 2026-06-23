import { describe, expect, it } from "@jest/globals";
import {
  clampPageIndex,
  isTrayPageInRenderWindow,
} from "../pages/model";

// probe pager window rules without rendering animated page layers
describe("TrayPages render window", () => {
  it("clamps requested pages into the registered range", () => {
    expect(clampPageIndex(-1, 3)).toBe(0);
    expect(clampPageIndex(0, 0)).toBe(0);
    expect(clampPageIndex(99, 3)).toBe(2);
    expect(clampPageIndex(1, 3)).toBe(1);
  });

  it("keeps only the active page mounted while idle", () => {
    expect(
      Array.from({ length: 5 }, (_, index) =>
        isTrayPageInRenderWindow(index, 0),
      ),
    ).toEqual([true, false, false, false, false]);

    expect(
      Array.from({ length: 5 }, (_, index) =>
        isTrayPageInRenderWindow(index, 2),
      ),
    ).toEqual([false, false, true, false, false]);

    expect(
      Array.from({ length: 5 }, (_, index) =>
        isTrayPageInRenderWindow(index, 4),
      ),
    ).toEqual([false, false, false, false, true]);
  });

  it("mounts only the outgoing and target pages during a transition", () => {
    expect(
      Array.from({ length: 5 }, (_, index) =>
        isTrayPageInRenderWindow(index, 2, 1),
      ),
    ).toEqual([false, true, true, false, false]);

    expect(
      Array.from({ length: 5 }, (_, index) =>
        isTrayPageInRenderWindow(index, 1, 2),
      ),
    ).toEqual([false, true, true, false, false]);
  });
});
