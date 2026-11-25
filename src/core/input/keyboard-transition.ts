import type { TrayTransitionContract } from "../../runtime/types";

export type KeyboardSheetTransitionIntent = {
  isSheetStepTransition: boolean;
  sourceOwnsKeyboard: boolean;
  targetOwnsKeyboard: boolean;
  entersKeyboard: boolean;
  leavesKeyboard: boolean;
};

// resolve keyboard ownership once from the transition descriptor so shell, content and sticky host share one policy
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

// a keyboard handoff is a sheet-to-sheet step change where either endpoint owns the keyboard, fullscreen boundaries stay on their own clock
export const isKeyboardAwareSheetStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) => {
  const intent = resolveKeyboardSheetTransitionIntent(transition);

  return (
    intent.isSheetStepTransition &&
    (intent.sourceOwnsKeyboard || intent.targetOwnsKeyboard)
  );
};

export type KeyboardDismissTiming = "none" | "withLayout" | "now";

// a step that puts the keyboard away dismisses it when its layout participant starts, a step without one dismisses at commit so the duty never goes unowned
export const resolveKeyboardDismissTiming = ({
  leavesKeyboard,
  layoutParticipant,
}: {
  leavesKeyboard: boolean;
  layoutParticipant: boolean;
}): KeyboardDismissTiming =>
  !leavesKeyboard ? "none" : layoutParticipant ? "withLayout" : "now";
