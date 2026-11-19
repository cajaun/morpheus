import React from "react";
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import type {
  TrayRegistration,
  TrayStackEntry,
  TrayTransitionContract,
} from "../tray-context";
import { resolveTrayStepOptions } from "../tray-step-options";
import {
  arePresentedTrayListsEquivalent,
  arePresentedTraysEquivalent,
  areTrayHostSlotsEquivalent,
  createIdleSlot,
  createPresentedTray,
  resolvePresenterTransitionScope,
  resolveNextActiveSlotIndex,
  resolveOrderedHostSlots,
} from "../presenter/model";
import type { PresentedTray, TrayHostSlot } from "../presenter/types";

// probe presenter model decisions without mounting host slots
// create a registered step node for presenter model tests
const step = (
  key: string,
  options?: TrayRegistration["steps"][number]["options"],
): TrayRegistration["steps"][number] => ({
  key,
  content: <Text>{key}</Text>,
  options,
});

// create a minimal presented payload for slot ordering tests
const presented = (rootTrayId: string): PresentedTray => ({
  rootTrayId,
  trayId: `${rootTrayId}-one`,
  stepOptions: {
    ...resolveTrayStepOptions(),
    hasFooter: false,
  },
  header: null,
  content: null,
  footer: null,
  fullScreenBoundaryExit: false,
  isFirstRender: false,
  fullScreen: false,
  fullScreenBackgroundScale: 1,
  fullScreenSafeAreaTop: false,
  fullScreenDraggable: true,
  dismissible: true,
  transitionContract: null,
  stackIndex: 0,
  visible: true,
  interactive: true,
});

// create a host slot with explicit visibility and interaction state
const slot = (
  payload: PresentedTray | null,
  visible: boolean,
  interactive: boolean,
): TrayHostSlot => ({
  assignmentId: payload ? 1 : 0,
  payload,
  visible,
  interactive,
});

describe("tray presenter model", () => {
  it("clamps invalid stack indexes to the last registered step", () => {
    const registration: TrayRegistration = {
      steps: [step("one"), step("two", { fullScreen: true })],
    };
    const entry: TrayStackEntry = { trayId: "settings", index: 99 };

    const tray = createPresentedTray({
      entry,
      registration,
      stackIndex: 0,
      stackLength: 1,
    });

    expect(tray?.trayId).toBe("settings-two");
    expect(tray?.fullScreen).toBe(true);
  });

const transition = (
  reason: TrayTransitionContract["reason"],
  fromTrayId: string | null,
  toTrayId: string | null,
): TrayTransitionContract => ({
  generation: 1,
  reason,
  direction: "forward",
  boundary: "sheetToSheet",
  from: fromTrayId
    ? {
        trayId: fromTrayId,
        stepIndex: 0,
        stepKey: "from",
        mode: "sheet",
      }
    : null,
  to: toTrayId
    ? {
        trayId: toTrayId,
        stepIndex: 0,
        stepKey: "to",
        mode: "sheet",
      }
    : null,
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: false,
  sharedRegions: [],
});

  it("does not duplicate the active surface onto detached footers", () => {
    const surfaceStyle = { backgroundColor: "white" };
    const registration: TrayRegistration = {
      steps: [step("one", { style: surfaceStyle, className: "sheet" })],
      footer: <Text>continue</Text>,
    };

    const tray = createPresentedTray({
      entry: { trayId: "onboarding", index: 0 },
      registration,
      stackIndex: 0,
      stackLength: 1,
    });

    expect(tray?.footerStyle).toBeUndefined();
    expect(tray?.footerClassName).toBeUndefined();
  });

  it("keeps explicit footer styling when a step provides it", () => {
    const surfaceStyle = { backgroundColor: "white" };
    const footerStyle = { backgroundColor: "red" };
    const registration: TrayRegistration = {
      steps: [
        step("one", {
          style: surfaceStyle,
          className: "sheet",
          footerStyle,
          footerClassName: "footer",
        }),
      ],
      footer: <Text>continue</Text>,
    };

    const tray = createPresentedTray({
      entry: { trayId: "onboarding", index: 0 },
      registration,
      stackIndex: 0,
      stackLength: 1,
    });

    expect(tray?.footerStyle).toBe(footerStyle);
    expect(tray?.footerClassName).toBe("footer");
  });

  it("reuses contextual step options for repeated presenter derivation", () => {
    const registration: TrayRegistration = {
      steps: [step("one")],
      footer: <Text>continue</Text>,
    };
    const entry: TrayStackEntry = { trayId: "onboarding", index: 0 };

    const first = createPresentedTray({
      entry,
      registration,
      stackIndex: 0,
      stackLength: 1,
    });
    const second = createPresentedTray({
      entry,
      registration,
      stackIndex: 0,
      stackLength: 1,
    });

    expect(first?.stepOptions).toBe(second?.stepOptions);
  });

  it("chooses the opposite host slot when replacing an active tray", () => {
    const slots: [TrayHostSlot, TrayHostSlot] = [
      slot(presented("alpha"), true, true),
      createIdleSlot(),
    ];

    expect(resolveNextActiveSlotIndex(slots, 0)).toBe(1);
    expect(resolveNextActiveSlotIndex(slots, 1)).toBe(0);
  });

  it("prefers idle slots then hidden slots when no active slot exists", () => {
    expect(
      resolveNextActiveSlotIndex(
        [slot(presented("alpha"), true, false), createIdleSlot()],
        null,
      ),
    ).toBe(1);

    expect(
      resolveNextActiveSlotIndex(
        [
          slot(presented("alpha"), true, false),
          slot(presented("beta"), false, false),
        ],
        null,
      ),
    ).toBe(1);
  });

  it("orders host slots so the interactive tray renders last", () => {
    const ordered = resolveOrderedHostSlots([
      slot(presented("active"), true, true),
      slot(presented("closing"), false, false),
    ]);

    expect(ordered.map((entry) => entry.slot.payload?.rootTrayId)).toEqual([
      "closing",
      "active",
    ]);
  });

  it("recognizes equivalent presenter payloads without requiring object identity", () => {
    const current = presented("active");
    const next = {
      ...current,
      stepOptions: { ...current.stepOptions },
    };

    expect(arePresentedTraysEquivalent(current, next)).toBe(true);
    expect(
      areTrayHostSlotsEquivalent(
        [slot(current, true, true), createIdleSlot()],
        [slot(next, true, true), createIdleSlot()],
      ),
    ).toBe(true);
    expect(arePresentedTrayListsEquivalent([current], [next])).toBe(true);
  });

  it("detects presentation changes that require a host rerender", () => {
    const current = presented("active");
    const next = { ...current, trayId: "active-two" };

    expect(arePresentedTraysEquivalent(current, next)).toBe(false);
  });

  it("scopes root and nested transition contracts to the affected presenter", () => {
    const rootStepTransition = transition("nextStep", "root", "root");
    const rootStepScope = resolvePresenterTransitionScope({
      transition: rootStepTransition,
      currentStack: [{ trayId: "root", index: 1 }],
      previousStackTrayIds: ["root"],
    });

    expect(rootStepScope.root).toBe(rootStepTransition);
    expect(rootStepScope.nested).toBeNull();

    const nestedStepTransition = transition(
      "nextStep",
      "nested",
      "nested",
    );
    const nestedStepScope = resolvePresenterTransitionScope({
      transition: nestedStepTransition,
      currentStack: [
        { trayId: "root", index: 0 },
        { trayId: "nested", index: 1 },
      ],
      previousStackTrayIds: ["root", "nested"],
    });

    expect(nestedStepScope.root).toBeNull();
    expect(nestedStepScope.nested).toBe(nestedStepTransition);

    const nestedCloseTransition = transition(
      "closeNested",
      "nested",
      "root",
    );
    const nestedCloseScope = resolvePresenterTransitionScope({
      transition: nestedCloseTransition,
      currentStack: [{ trayId: "root", index: 0 }],
      previousStackTrayIds: ["root", "nested"],
    });

    expect(nestedCloseScope.root).toBeNull();
    expect(nestedCloseScope.nested).toBe(nestedCloseTransition);
  });
});

describe("step preloading", () => {
  const present = (registration: TrayRegistration, index: number) =>
    createPresentedTray({
      entry: { trayId: "flow", index },
      registration,
      stackIndex: 0,
      stackLength: 1,
    });

  const preloadedIds = (registration: TrayRegistration, index: number) =>
    present(registration, index)?.preloadedSteps?.map(
      (preloaded) => preloaded.trayId,
    );

  it("keeps the next and previous steps rendered by default", () => {
    const registration: TrayRegistration = {
      steps: [step("one"), step("two"), step("three")],
    };

    const tray = present(registration, 0);

    expect(tray?.preloadCapable).toBe(true);
    expect(preloadedIds(registration, 0)).toEqual(["flow-two"]);
    expect(tray?.preloadedSteps?.[0]?.content).toBe(
      registration.steps[1]!.content,
    );
    expect(preloadedIds(registration, 1)).toEqual(["flow-three", "flow-one"]);
    expect(preloadedIds(registration, 2)).toEqual(["flow-two"]);
  });

  it("does not preload a step that opts out", () => {
    const registration: TrayRegistration = {
      steps: [step("one"), step("two", { preload: false }), step("three")],
    };

    expect(preloadedIds(registration, 0)).toEqual([]);
    expect(preloadedIds(registration, 1)).toEqual(["flow-three", "flow-one"]);
    expect(preloadedIds(registration, 2)).toEqual([]);
  });

  it("preloads into and out of fullscreen steps", () => {
    const registration: TrayRegistration = {
      steps: [step("one"), step("two", { fullScreen: true }), step("three")],
    };

    expect(preloadedIds(registration, 0)).toEqual(["flow-two"]);
    expect(present(registration, 0)?.preloadedSteps?.[0]?.stepOptions)
      .toMatchObject({ fullScreen: true });
    expect(preloadedIds(registration, 1)).toEqual(["flow-three", "flow-one"]);
  });

  it("leaves single-step trays and fully opted-out trays unchanged", () => {
    const single = present({ steps: [step("one")] }, 0);
    const optedOut = present(
      {
        steps: [
          step("one", { preload: false }),
          step("two", { preload: false }),
        ],
      },
      0,
    );

    expect(single?.preloadCapable).toBe(false);
    expect(optedOut?.preloadCapable).toBe(false);
    expect(optedOut?.preloadedSteps).toEqual([]);
  });

  it("treats a new preload target as a payload change", () => {
    const registration: TrayRegistration = {
      steps: [step("one"), step("two"), step("three")],
    };
    const first = present(registration, 0);
    const again = present(registration, 0);

    expect(arePresentedTraysEquivalent(first, again)).toBe(true);
    expect(
      arePresentedTraysEquivalent(first, {
        ...first!,
        preloadedSteps: [],
      }),
    ).toBe(false);
  });
});
