import { describe, expect, it } from "@jest/globals";
import type {
  TrayPresentationEndpoint,
  TrayRegistration,
  TrayTransitionBoundary,
  TrayTransitionReason,
} from "../types";
import {
  createTrayTransitionContract,
  resolveTrayPresentationEndpoint,
} from "../transition-contract";

const endpoint = (
  mode: TrayPresentationEndpoint["mode"],
  stepIndex = 0,
  pageIndex?: number,
): TrayPresentationEndpoint => ({
  trayId: "root",
  stepIndex,
  stepKey: `step-${stepIndex}`,
  pageIndex,
  mode,
});

describe("transition contract QA technique coverage", () => {
  describe("[Decision Table] presentation boundary combinations", () => {
    const rules: {
      id: string;
      from: TrayPresentationEndpoint | null;
      to: TrayPresentationEndpoint | null;
      expected: TrayTransitionBoundary;
      fullScreenChanged: boolean;
    }[] = [
      {
        id: "AT-DT-001",
        from: null,
        to: endpoint("sheet"),
        expected: "opening",
        fullScreenChanged: false,
      },
      {
        id: "AT-DT-002",
        from: endpoint("sheet"),
        to: null,
        expected: "closing",
        fullScreenChanged: false,
      },
      {
        id: "AT-DT-003",
        from: endpoint("sheet"),
        to: endpoint("sheet", 1),
        expected: "sheetToSheet",
        fullScreenChanged: false,
      },
      {
        id: "AT-DT-004",
        from: endpoint("sheet"),
        to: endpoint("fullScreen", 1),
        expected: "sheetToFullScreen",
        fullScreenChanged: true,
      },
      {
        id: "AT-DT-005",
        from: endpoint("fullScreen"),
        to: endpoint("sheet", 1),
        expected: "fullScreenToSheet",
        fullScreenChanged: true,
      },
      {
        id: "AT-DT-006",
        from: endpoint("fullScreen"),
        to: endpoint("fullScreen", 1),
        expected: "fullScreenToFullScreen",
        fullScreenChanged: false,
      },
    ];

    it.each(rules)("$id resolves $expected", ({ from, to, expected, fullScreenChanged }) => {
      const transition = createTrayTransitionContract({
        generation: 1,
        reason: from === null ? "open" : to === null ? "dismiss" : "nextStep",
        from,
        to,
      });

      expect(transition.boundary).toBe(expected);
      expect(transition.fullScreenChanged).toBe(fullScreenChanged);
    });
  });

  describe("[3-value BVA] active step index clamping", () => {
    const registration: TrayRegistration = {
      steps: [0, 1, 2].map((index) => ({
        key: `step-${index}`,
        content: null,
      })),
    };

    it.each([
      ["AT-BVA-001", -1, 0],
      ["AT-BVA-002", 0, 0],
      ["AT-BVA-003", 1, 1],
      ["AT-BVA-004", 2, 2],
      ["AT-BVA-005", 3, 2],
    ])("%s maps index %i to %i", (_id, input, expected) => {
      const resolved = resolveTrayPresentationEndpoint({
        entry: { trayId: "root", index: input as number },
        registration,
      });

      expect(resolved?.stepIndex).toBe(expected);
      expect(resolved?.stepKey).toBe(`step-${expected}`);
    });

    it("AT-BVA-006 rejects an empty step partition", () => {
      expect(
        resolveTrayPresentationEndpoint({
          entry: { trayId: "root", index: 0 },
          registration: { steps: [] },
        }),
      ).toBeNull();
    });
  });

  describe("[Equivalence Partitioning] navigation reasons", () => {
    const partitions: [string, TrayTransitionReason, string][] = [
      ["AT-EP-001", "nextStep", "forward"],
      ["AT-EP-002", "previousStep", "backward"],
      ["AT-EP-003", "returnToShell", "backward"],
      ["AT-EP-004", "open", "none"],
      ["AT-EP-005", "dismiss", "none"],
    ];

    it.each(partitions)("%s maps %s to %s", (_id, reason, direction) => {
      expect(
        createTrayTransitionContract({
          generation: 1,
          reason,
          from: endpoint("sheet"),
          to: endpoint("sheet", 1),
        }).direction,
      ).toBe(direction);
    });
  });

  it("AT-REG-001 preserves fullscreen page D as the source of a forward shell exit", () => {
    const transition = createTrayTransitionContract({
      generation: 9,
      reason: "nextStep",
      from: endpoint("fullScreen", 2, 3),
      to: endpoint("sheet", 3),
    });

    expect(transition).toMatchObject({
      direction: "forward",
      boundary: "fullScreenToSheet",
      from: { stepIndex: 2, pageIndex: 3, mode: "fullScreen" },
      to: { stepIndex: 3, pageIndex: undefined, mode: "sheet" },
    });
  });
});
