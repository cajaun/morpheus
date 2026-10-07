import React from "react";
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import type {
  TrayRegistration,
  TrayStackEntry,
} from "../tray-context";
import { resolveTrayStepOptions } from "../tray-step-options";
import {
  arePresentedTrayListsEquivalent,
  arePresentedTraysEquivalent,
  areTrayHostSlotsEquivalent,
  createIdleSlot,
  createPresentedTray,
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
});
