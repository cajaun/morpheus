import { describe, expect, it } from "@jest/globals";
import type {
  TrayHostStateValue,
  TrayPresentationEndpoint,
  TrayRegistration,
} from "../../types";
import {
  clampTrayRuntimeState,
  clampTrayStepIndex,
  createInitialTrayHostState,
  resolveSharedRegions,
} from "../tray-runtime-state";

const keyboardHeight = { value: 0 } as never;

const endpoint = (
  stepIndex: number,
  mode: TrayPresentationEndpoint["mode"],
): TrayPresentationEndpoint => ({
  trayId: "tray",
  stepIndex,
  stepKey: `step-${stepIndex}`,
  mode,
});

const registration: TrayRegistration = {
  steps: [
    { key: "step-0", content: null },
    { key: "step-1", content: null },
  ],
};

describe("tray runtime state", () => {
  it("clamps navigation indexes to the registered step range", () => {
    expect(clampTrayStepIndex(-1, 2)).toBe(0);
    expect(clampTrayStepIndex(8, 2)).toBe(1);
    expect(clampTrayStepIndex(4, 0)).toBe(0);
  });

  it("removes unregistered stack entries and clamps retained entries", () => {
    const state: TrayHostStateValue = {
      ...createInitialTrayHostState(keyboardHeight),
      registry: { tray: registration },
      activeTrayId: "removed",
      activeIndex: 8,
      stack: [
        { trayId: "tray", index: 8 },
        { trayId: "removed", index: 0 },
      ],
    };

    expect(clampTrayRuntimeState(state)).toMatchObject({
      activeTrayId: "tray",
      activeIndex: 1,
      stack: [{ trayId: "tray", index: 1 }],
    });
  });

  it("preserves state identity when registration reconciliation is a no-op", () => {
    const state: TrayHostStateValue = {
      ...createInitialTrayHostState(keyboardHeight),
      registry: { tray: registration },
      activeTrayId: "tray",
      activeIndex: 1,
      stack: [{ trayId: "tray", index: 1 }],
    };

    expect(clampTrayRuntimeState(state)).toBe(state);
  });

  it("keeps footer and header ownership explicit across a boundary", () => {
    const current: TrayHostStateValue = {
      ...createInitialTrayHostState(keyboardHeight),
      registry: {
        tray: { ...registration, footer: "footer" },
      },
    };
    const next: TrayHostStateValue = {
      ...current,
      registry: {
        tray: {
          ...registration,
          footer: "footer",
          steps: [
            registration.steps[0],
            {
              ...registration.steps[1],
              header: "header",
            },
          ],
        },
      },
    };

    expect(
      resolveSharedRegions(
        current,
        next,
        endpoint(0, "sheet"),
        endpoint(1, "fullScreen"),
      ),
    ).toEqual([
      expect.objectContaining({ region: "surface", behavior: "persistent" }),
      expect.objectContaining({ region: "header", behavior: "keyedOverlap" }),
      expect.objectContaining({ region: "body", behavior: "replace" }),
      expect.objectContaining({ region: "footer", behavior: "persistent" }),
    ]);
  });
});
