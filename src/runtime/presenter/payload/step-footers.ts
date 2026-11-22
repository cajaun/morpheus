import { isValidElement, type ReactNode } from "react";
import { type TrayRegistration } from "../../tray-context";

// a tray that opens from its trigger morphs the trigger into its footer, which stays on the fixed footer layer
export const usesOriginFooterTransition = (registration: TrayRegistration) =>
  registration.transition?.open === "expandFromTrigger" ||
  registration.transition?.close === "collapseToTrigger" ||
  registration.transition?.origin === "fullScreenFooter";

// fixed per registration, every footer uses the step footer layers except a root-only footer of a trigger-morph tray
export const usesStepFooters = (registration: TrayRegistration) => {
  const stepsDefineFooters = registration.steps.some(
    (step) => step.footer != null,
  );

  if (stepsDefineFooters) {
    return true;
  }

  if (registration.footer == null || usesOriginFooterTransition(registration)) {
    return false;
  }

  return true;
};

// footers without an id share this key, so consecutive steps with a footer keep one on screen by default
export const DEFAULT_STEP_FOOTER_KEY = "default";

// the step's footer node and layer key, footers without an id share one layer and an id marks a different footer
export const resolveStepFooter = (
  registration: TrayRegistration,
  step: TrayRegistration["steps"][number],
): { node: ReactNode; key: string } | null => {
  if (!usesStepFooters(registration)) {
    return null;
  }

  if (step.footer != null) {
    return {
      node: step.footer,
      key:
        step.footerId != null
          ? `id:${step.footerId}`
          : DEFAULT_STEP_FOOTER_KEY,
    };
  }

  if (registration.footer != null) {
    // a root footer honors its own id the same way a step footer does
    const rootFooterId = isValidElement<{ id?: unknown }>(registration.footer)
      ? registration.footer.props.id
      : undefined;

    return {
      node: registration.footer,
      key:
        typeof rootFooterId === "string"
          ? `id:${rootFooterId}`
          : DEFAULT_STEP_FOOTER_KEY,
    };
  }

  return null;
};

export const stepHasFooter = (
  registration: TrayRegistration,
  step: TrayRegistration["steps"][number],
) => step.footer != null || registration.footer != null;
