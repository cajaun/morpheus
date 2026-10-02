import type { TrayTransitionContract } from "../../runtime/types";

export type KeyboardSheetTransitionIntent = {
  isSheetStepTransition: boolean;
  sourceOwnsKeyboard: boolean;
  targetOwnsKeyboard: boolean;
  entersKeyboard: boolean;
  leavesKeyboard: boolean;
};

// Resolve keyboard ownership once from the immutable transition descriptor so
// the shell, content, and sticky host cannot drift into different policies.
export const resolveKeyboardSheetTransitionIntent = (
  transition: TrayTransitionContract | null | undefined,
): KeyboardSheetTransitionIntent => {
  const isSheetStepTransition =
    transition?.stepChanged === true &&
    transition.fullScreenChanged === false &&
    transition.from?.trayId === transition.to?.trayId &&
    transition.from?.mode === "sheet" &&
    transition.to?.mode === "sheet";
  const sourceOwnsKeyboard = transition?.from?.keyboardAware === true;
  const targetOwnsKeyboard = transition?.to?.keyboardAware === true;

  return {
    isSheetStepTransition,
    sourceOwnsKeyboard,
    targetOwnsKeyboard,
    entersKeyboard:
      isSheetStepTransition && !sourceOwnsKeyboard && targetOwnsKeyboard,
    leavesKeyboard:
      isSheetStepTransition && sourceOwnsKeyboard && !targetOwnsKeyboard,
  };
};

// Keyboard handoff is a sheet-to-sheet step change where either endpoint owns
// the keyboard. Fullscreen boundaries deliberately stay on their existing
// transition clock and are not classified by this helper.
export const isKeyboardAwareSheetStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) => {
  const intent = resolveKeyboardSheetTransitionIntent(transition);

  return (
    intent.isSheetStepTransition &&
    (intent.sourceOwnsKeyboard || intent.targetOwnsKeyboard)
  );
};
