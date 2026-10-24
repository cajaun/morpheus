import type { TrayHostStateValue, TrayRegistration } from "../types";

type TrayPresenterRegistration = Pick<
  TrayRegistration,
  "steps" | "footer" | "dismissible" | "transition"
>;

export type TrayPresenterState = {
  registry: Record<string, TrayPresenterRegistration>;
  stack: TrayHostStateValue["stack"];
  transition: TrayHostStateValue["lastTransition"];
};

const arePresenterRegistrationsEquivalent = (
  previous: TrayPresenterRegistration | undefined,
  next: TrayRegistration | undefined,
) =>
  previous !== undefined &&
  next !== undefined &&
  previous.steps === next.steps &&
  previous.footer === next.footer &&
  previous.dismissible === next.dismissible &&
  previous.transition === next.transition;

// Keep the presenter subscribed to only registrations that can currently
// produce a host. Inactive Tray.Nested registrations still belong in the
// runtime registry, but they must not rebuild the mounted presenter tree.
export const createTrayPresenterStateSelector = () => {
  let previousState: TrayHostStateValue | null = null;
  let previousSelection: TrayPresenterState | null = null;

  return (state: TrayHostStateValue): TrayPresenterState => {
    if (state === previousState && previousSelection !== null) {
      return previousSelection;
    }

    const previousStack = previousSelection?.stack;
    const stackChanged = previousStack !== state.stack;
    let relevantRegistrationChanged = stackChanged;

    if (!relevantRegistrationChanged && previousSelection !== null) {
      for (const entry of state.stack) {
        if (
          !arePresenterRegistrationsEquivalent(
            previousSelection.registry[entry.trayId],
            state.registry[entry.trayId],
          )
        ) {
          relevantRegistrationChanged = true;
          break;
        }
      }
    }

    if (
      !relevantRegistrationChanged &&
      previousSelection !== null &&
      previousSelection.transition === state.lastTransition
    ) {
      previousState = state;
      return previousSelection;
    }

    const registry: Record<string, TrayPresenterRegistration> = {};

    for (const entry of state.stack) {
      const registration = state.registry[entry.trayId];

      if (registration !== undefined) {
        registry[entry.trayId] = {
          steps: registration.steps,
          footer: registration.footer,
          dismissible: registration.dismissible,
          transition: registration.transition,
        };
      }
    }

    const nextSelection: TrayPresenterState = {
      registry,
      stack: state.stack,
      transition: state.lastTransition,
    };

    previousState = state;
    previousSelection = nextSelection;
    return nextSelection;
  };
};
