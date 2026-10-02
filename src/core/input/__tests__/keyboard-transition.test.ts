import { describe, expect, it } from "@jest/globals";
import {
  isKeyboardAwareSheetStepTransition,
  resolveKeyboardSheetTransitionIntent,
} from "../keyboard-transition";

type TransitionOptions = {
  fromKeyboardAware?: boolean;
  toKeyboardAware?: boolean;
  fromMode?: "sheet" | "fullScreen";
  toMode?: "sheet" | "fullScreen";
};

const transition = ({
  fromKeyboardAware = false,
  toKeyboardAware = false,
  fromMode = "sheet",
  toMode = "sheet",
}: TransitionOptions = {}) =>
  ({
    generation: 1,
    reason: "nextStep",
    direction: "forward",
    boundary: "sheetToSheet",
    from: {
      trayId: "tray",
      stepIndex: 0,
      stepKey: "from",
      mode: fromMode,
      keyboardAware: fromKeyboardAware,
    },
    to: {
      trayId: "tray",
      stepIndex: 1,
      stepKey: "to",
      mode: toMode,
      keyboardAware: toKeyboardAware,
    },
    stepChanged: true,
    pageChanged: false,
    fullScreenChanged: fromMode !== toMode,
    sharedRegions: [],
  }) as const;

describe("keyboard sheet transition intent", () => {
  it("classifies a regular sheet to keyboard sheet transition", () => {
    const intent = resolveKeyboardSheetTransitionIntent(
      transition({ toKeyboardAware: true }),
    );

    expect(intent).toEqual({
      isSheetStepTransition: true,
      sourceOwnsKeyboard: false,
      targetOwnsKeyboard: true,
      entersKeyboard: true,
      leavesKeyboard: false,
    });
    expect(isKeyboardAwareSheetStepTransition(transition({ toKeyboardAware: true }))).toBe(
      true,
    );
  });

  it("keeps keyboard-to-keyboard transitions on the same handoff path", () => {
    const keyboardHandoff = transition({
      fromKeyboardAware: true,
      toKeyboardAware: true,
    });
    const intent = resolveKeyboardSheetTransitionIntent(keyboardHandoff);

    expect(intent.isSheetStepTransition).toBe(true);
    expect(intent.entersKeyboard).toBe(false);
    expect(intent.leavesKeyboard).toBe(false);
    expect(isKeyboardAwareSheetStepTransition(keyboardHandoff)).toBe(true);
  });

  it("classifies leaving the keyboard without treating it as an entry", () => {
    const intent = resolveKeyboardSheetTransitionIntent(
      transition({ fromKeyboardAware: true }),
    );

    expect(intent.leavesKeyboard).toBe(true);
    expect(intent.entersKeyboard).toBe(false);
  });

  it("does not classify fullscreen boundaries as sheet keyboard handoffs", () => {
    const intent = resolveKeyboardSheetTransitionIntent(
      transition({ fromKeyboardAware: false, toKeyboardAware: true, toMode: "fullScreen" }),
    );

    expect(intent.isSheetStepTransition).toBe(false);
    expect(intent.entersKeyboard).toBe(false);
    expect(isKeyboardAwareSheetStepTransition(transition({ toMode: "fullScreen" }))).toBe(
      false,
    );
  });
});
