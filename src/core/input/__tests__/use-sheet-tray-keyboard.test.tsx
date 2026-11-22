import React from "react";
import { beforeEach, describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { useSheetTrayKeyboard } from "../use-tray-keyboard";

const mockDismiss = jest.fn(() => Promise.resolve());

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardController: {
    dismiss: (...args: unknown[]) => mockDismiss(...(args as [])),
    preload: jest.fn(),
  },
  KeyboardEvents: { addListener: () => ({ remove: jest.fn() }) },
  useKeyboardState: (selector: (state: { isVisible: boolean }) => boolean) =>
    selector({ isVisible: true }),
}));

type Params = Parameters<typeof useSheetTrayKeyboard>[0];

const Probe = (props: Params) => {
  useSheetTrayKeyboard(props);
  return null;
};

// start on a keyboard-aware sheet step, then commit a sheet step change
const changeStep = (next: Partial<Params>) => {
  const base: Params = {
    visible: true,
    keyboardAware: true,
    targetKeyboardAware: false,
    sheetStepTransition: false,
    transitionGeneration: 1,
  };
  let renderer: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(<Probe {...base} />);
  });
  act(() => {
    renderer.update(
      <Probe
        {...base}
        keyboardAware={false}
        sheetStepTransition
        transitionGeneration={2}
        {...next}
      />,
    );
  });
};

describe("useSheetTrayKeyboard step changes", () => {
  beforeEach(() => {
    mockDismiss.mockClear();
  });

  // the keyboard gate dismisses when the step's layout is ready so the keyboard starts with the sheet
  it("leaves a sheet step that puts the keyboard away to the keyboard gate", () => {
    changeStep({});

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it("leaves a keyboard-to-keyboard handoff to the focused input", () => {
    changeStep({ targetKeyboardAware: true });

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it("dismisses when the tray closes from a keyboard step", () => {
    changeStep({ visible: false, sheetStepTransition: false });

    expect(mockDismiss).toHaveBeenCalledWith({ keepFocus: false, animated: true });
  });
});
