import type {
  TrayHostActionsValue,
  TrayRegistration,
} from "../types";
import { areTrayRegistrationsEquivalent } from "../registration-equality";
import {
  clampTrayRuntimeState,
  reconcileTransitionAfterRegistration,
  withTrayTransition,
} from "./tray-runtime-state";
import type { TrayRuntimeActionContext } from "./tray-runtime-action-context";

type RegistrationActions = Pick<
  TrayHostActionsValue,
  "registerTray" | "unregisterTray" | "registerTrayPages"
>;

// registration commands keep the runtime registry aligned with rendered trays
export const createTrayRuntimeRegistrationActions = ({
  getState,
  setState,
  allocateTransitionGeneration,
  getPendingPageTransition,
  setPendingPageTransition,
}: TrayRuntimeActionContext): RegistrationActions => ({
  registerTray: (id: string, registration: TrayRegistration) => {
    setState((current) => {
      if (areTrayRegistrationsEquivalent(current.registry[id], registration)) {
        return current;
      }

      const existingPages = current.registry[id]?.pages;
      const next = clampTrayRuntimeState({
        ...current,
        registry: {
          ...current.registry,
          [id]: {
            ...registration,
            pages: existingPages,
          },
        },
      });

      return reconcileTransitionAfterRegistration(current, next, id);
    });
  },
  unregisterTray: (id: string) => {
    setState((current) => {
      if (!(id in current.registry)) {
        return current;
      }

      const nextRegistry = { ...current.registry };
      delete nextRegistry[id];

      const next = clampTrayRuntimeState({
        ...current,
        registry: nextRegistry,
      });

      if (current.stack.some((entry) => entry.trayId === id)) {
        return withTrayTransition(
          current,
          next,
          current.stack.length > 1 ? "closeNested" : "dismiss",
          allocateTransitionGeneration(),
        );
      }

      return next;
    });
  },
  registerTrayPages: (id, pages) => {
    setState((current) => {
      const registration = current.registry[id];

      if (!registration || registration.pages === pages) {
        return current;
      }

      const next = {
        ...current,
        registry: {
          ...current.registry,
          [id]: {
            ...registration,
            pages: pages ?? undefined,
          },
        },
      };

      const previousPages = registration.pages;
      const recordsPageChange =
        pages !== null &&
        previousPages !== undefined &&
        previousPages.stepKey === pages.stepKey &&
        previousPages.pageIndex !== pages.pageIndex;

      if (!recordsPageChange) {
        return next;
      }

      const pendingTransition = getPendingPageTransition();
      setPendingPageTransition(null);

      if (
        pendingTransition?.to?.trayId === id &&
        pendingTransition.to.stepKey === pages.stepKey &&
        pendingTransition.to.pageIndex === pages.pageIndex
      ) {
        return {
          ...next,
          transitionGeneration: pendingTransition.generation,
          transition: pendingTransition,
        };
      }

      return withTrayTransition(
        current,
        next,
        "pageChange",
        allocateTransitionGeneration(),
      );
    });
  },
});
