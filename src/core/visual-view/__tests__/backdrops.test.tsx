// the backdrop's dim while a tray opens, closes, or grows out of its trigger
import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";

const mockBackdropProgress: { value: number }[] = [];

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<object>("react-native-reanimated/mock"),
  useDerivedValue: (updater: () => number) => ({ value: updater() }),
}));

jest.mock("../../../primitives/backdrop", () => ({
  Backdrop: ({ progress }: { progress: { value: number } }) => {
    mockBackdropProgress.push(progress);
    return null;
  },
}));

// eslint-disable-next-line import/first
import { TrayBackdropInteractionContext } from "../contexts";
// eslint-disable-next-line import/first
import { TrayOriginTransitionBackdrop } from "../backdrops";

const renderBackdrop = (originProgress: number, progress: number) => {
  mockBackdropProgress.length = 0;

  act(() => {
    TestRenderer.create(
      <TrayBackdropInteractionContext.Provider
        value={{ interactive: true, onRequestClose: () => {} } as never}
      >
        <TrayOriginTransitionBackdrop
          isRendered
          originProgress={{ value: originProgress } as never}
          progress={{ value: progress } as never}
        />
      </TrayBackdropInteractionContext.Provider>,
    );
  });

  return mockBackdropProgress[mockBackdropProgress.length - 1]!.value;
};

describe("tray backdrop", () => {
  it("dims with the tray's position when no trigger expansion is running", () => {
    // origin progress rests at 1, so one backdrop serves every tray without a remount
    expect(renderBackdrop(1, 0.4)).toBeCloseTo(0.4, 5);
  });

  it("dims with the expansion while a tray grows out of its trigger at its open position", () => {
    expect(renderBackdrop(0.25, 1)).toBeCloseTo(0.25, 5);
  });

  it("stays clear once a collapsed tray resets its expansion to rest", () => {
    // closed position with origin progress reset to 1 is no dim, not a flash
    expect(renderBackdrop(1, 0)).toBe(0);
  });
});
