import type { TrayTransitionContract } from "../../runtime/types";

// A keyboard handoff is a sheet-to-sheet step change where either endpoint
// owns the keyboard. Fullscreen transitions use their existing boundary clock.
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
