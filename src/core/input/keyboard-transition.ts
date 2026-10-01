import type { TrayTransitionContract } from "../../runtime/types";

// Keyboard handoff is a sheet-to-sheet step change where either endpoint owns
// the keyboard. Fullscreen boundaries deliberately stay on their existing
// transition clock and are not classified by this helper.
export const isKeyboardAwareSheetStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) =>
  transition?.stepChanged === true &&
  transition.fullScreenChanged === false &&
  transition.from?.trayId === transition.to?.trayId &&
  transition.from?.mode === "sheet" &&
  transition.to?.mode === "sheet" &&
  (transition.from?.keyboardAware === true ||
    transition.to?.keyboardAware === true);
