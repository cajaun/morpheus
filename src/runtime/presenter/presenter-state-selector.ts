import type { TrayHostStateValue, TrayRegistration } from "../types";

type TrayPresenterRegistration = Pick<
  TrayRegistration,
  "steps" | "footer" | "dismissible" | "transition" | "parentTrayId"
>;

export type PreparedNestedTrayRegistration = TrayPresenterRegistration & {
  parentCanPresentFullScreen: boolean;
};

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
  previous.transition === next.transition &&
  previous.parentTrayId === next.parentTrayId;

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

    // A transition-only update changes presentation scope, not registration
    // data. Reuse the selected registry instead of copying every active host.
    let registry = previousSelection?.registry;

    if (relevantRegistrationChanged || registry === undefined) {
      registry = {};

      for (const entry of state.stack) {
        const registration = state.registry[entry.trayId];

        if (registration !== undefined) {
          registry[entry.trayId] = {
            steps: registration.steps,
            footer: registration.footer,
            dismissible: registration.dismissible,
            transition: registration.transition,
            parentTrayId: registration.parentTrayId,
          };
        }
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

const arePreparedNestedTrayRegistrationsEquivalent = (
  previous: PreparedNestedTrayRegistration,
  next: TrayRegistration,
  parentCanPresentFullScreen: boolean,
) =>
  previous.steps === next.steps &&
  previous.footer === next.footer &&
  previous.dismissible === next.dismissible &&
  previous.transition === next.transition &&
  previous.parentTrayId === next.parentTrayId &&
  previous.parentCanPresentFullScreen === parentCanPresentFullScreen;

const arePreparedNestedTrayFieldsEquivalent = (
  previous: PreparedNestedTrayRegistration,
  next: TrayRegistration,
) =>
  previous.steps === next.steps &&
  previous.footer === next.footer &&
  previous.dismissible === next.dismissible &&
  previous.transition === next.transition &&
  previous.parentTrayId === next.parentTrayId;

const areParentMotionCapabilityInputsEquivalent = (
  previous: TrayRegistration | undefined,
  next: TrayRegistration | undefined,
) =>
  previous === next ||
  (previous !== undefined &&
    next !== undefined &&
    previous.steps === next.steps &&
    previous.transition === next.transition);

// Prepared shells depend on presentation registration data, not page progress.
// Keep the selected snapshot stable when TrayPages only updates `pages`.
export const createPreparedNestedTraySelector = () => {
  let previousState: TrayHostStateValue | null = null;
  let previousRegistry: TrayHostStateValue["registry"] | null = null;
  let previousSelection: Record<string, PreparedNestedTrayRegistration> | null =
    null;

  return (
    state: TrayHostStateValue,
  ): Record<string, PreparedNestedTrayRegistration> => {
    if (state === previousState && previousSelection !== null) {
      return previousSelection;
    }

    if (
      previousSelection !== null &&
      state.registry === previousRegistry
    ) {
      previousState = state;
      return previousSelection;
    }

    let nextSelection = previousSelection;
    let selectionChanged = previousSelection === null;
    const parentCapabilityCache = new Map<TrayRegistration, boolean>();

    Object.entries(state.registry).forEach(([trayId, registration]) => {
      if (registration.parentTrayId == null) {
        return;
      }

      const parentRegistration = state.registry[registration.parentTrayId];
      const previousRegistration = previousSelection?.[trayId];

      // Build the hidden host only once the parent's transition is done. A
      // host that was already prepared is kept.
      if (
        registration.deferHostPreparation === true &&
        previousRegistration === undefined
      ) {
        return;
      }
      const previousParentRegistration =
        previousState?.registry[registration.parentTrayId];

      // A pages-only registration replaces the registry object but leaves
      // prepared-host inputs unchanged. Reuse the prior result without
      // rescanning its parent's steps or rebuilding this entry.
      if (
        previousRegistration !== undefined &&
        arePreparedNestedTrayFieldsEquivalent(
          previousRegistration,
          registration,
        ) &&
        areParentMotionCapabilityInputsEquivalent(
          previousParentRegistration,
          parentRegistration,
        )
      ) {
        return;
      }

      let parentCanPresentFullScreen = false;

      if (parentRegistration !== undefined) {
        const cachedCapability = parentCapabilityCache.get(parentRegistration);

        if (cachedCapability !== undefined) {
          parentCanPresentFullScreen = cachedCapability;
        } else {
          parentCanPresentFullScreen =
            parentRegistration.transition?.open === "expandFromTrigger" ||
            parentRegistration.steps.some(
              (step) => step.options?.fullScreen === true,
            );
          parentCapabilityCache.set(
            parentRegistration,
            parentCanPresentFullScreen,
          );
        }
      }

      if (
        previousRegistration !== undefined &&
        arePreparedNestedTrayRegistrationsEquivalent(
          previousRegistration,
          registration,
          parentCanPresentFullScreen,
        )
      ) {
        return;
      }

      if (!selectionChanged) {
        nextSelection = { ...previousSelection! };
      } else if (nextSelection === null) {
        nextSelection = {};
      }

      selectionChanged = true;
      nextSelection![trayId] = {
        steps: registration.steps,
        footer: registration.footer,
        dismissible: registration.dismissible,
        transition: registration.transition,
        parentTrayId: registration.parentTrayId,
        parentCanPresentFullScreen,
      };
    });

    if (previousSelection !== null) {
      for (const trayId of Object.keys(previousSelection)) {
        const registration = state.registry[trayId];

        if (registration?.parentTrayId != null) {
          continue;
        }

        if (!selectionChanged) {
          nextSelection = { ...previousSelection };
          selectionChanged = true;
        }

        delete nextSelection![trayId];
      }
    }

    previousState = state;
    previousRegistry = state.registry;

    if (!selectionChanged && previousSelection !== null) {
      return previousSelection;
    }

    previousSelection = nextSelection ?? {};
    return previousSelection;
  };
};
