import type { TrayTransitionContract } from "../../runtime/types";

const isKeyboardAwareStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) =>
  transition?.stepChanged === true &&
  transition.from?.trayId === transition.to?.trayId &&
  (transition.from?.keyboardAware === true ||
    transition.to?.keyboardAware === true);

// The immutable policy covers fullscreen boundaries so exiting content can
// join the boundary layout clock deterministically.
export const isKeyboardAwareTrayStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) => isKeyboardAwareStepTransition(transition);

// Pre-paint publication is intentionally limited to sheet-to-sheet changes.
// Fullscreen boundaries must wait for their existing boundary clock; publishing
// them here would make incoming content appear before the shell morph begins.
export const isKeyboardAwareSheetStepTransition = (
  transition: TrayTransitionContract | null | undefined,
) =>
  isKeyboardAwareStepTransition(transition) &&
  transition?.fullScreenChanged === false &&
  transition.from?.mode === "sheet" &&
  transition.to?.mode === "sheet";
