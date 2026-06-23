import React from "react";
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import type {
  TrayRegistration,
  TrayStackEntry,
} from "../tray-context";
import {
  createIdleSlot,
  createPresentedTray,
  resolveNextActiveSlotIndex,
  resolveOrderedHostSlots,
} from "../presenter/model";
import type { PresentedTray, TrayHostSlot } from "../presenter/types";

// probe presenter model decisions without mounting host slots
const step = (
  key: string,
  options?: TrayRegistration["steps"][number]["options"],
): TrayRegistration["steps"][number] => ({
  key,
  content: <Text>{key}</Text>,
  options,
});

const presented = (rootTrayId: string): PresentedTray => ({
  rootTrayId,
  trayId: `${rootTrayId}-one`,
  keyboardTransitionMode: "idle",
  header: null,
  content: null,
  footer: null,
  fullScreen: false,
  fullScreenBackgroundScale: 1,
  fullScreenSafeAreaTop: false,
  fullScreenDraggable: true,
  dismissible: true,
  stackIndex: 0,
  visible: true,
  interactive: true,
});

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

  it("mirrors the active step surface onto detached footers", () => {
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

    expect(tray?.footerStyle).toBe(surfaceStyle);
    expect(tray?.footerClassName).toBe("sheet");
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
});
