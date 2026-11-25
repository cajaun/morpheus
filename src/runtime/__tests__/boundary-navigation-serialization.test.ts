// a step change that keeps the presentation mode waits for an in-flight fullscreen boundary, so the boundary clock is never cut off
import { describe, expect, it } from "@jest/globals";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";
import type { TrayRegistration } from "../types";

const createStore = () =>
  createTrayRuntimeStore({
    anticipateKeyboard: () => undefined,
    prepareKeyboardHandoff: () => undefined,
    dismissFocusedInputs: () => undefined,
    registerFocusable: () => () => undefined,
  });

const registration: TrayRegistration = {
  steps: [
    { key: "sheet", content: null },
    { key: "full-one", content: null, options: { fullScreen: true } },
    { key: "full-two", content: null, options: { fullScreen: true } },
  ],
};

const openAtBoundary = () => {
  const store = createStore();

  store.actions.registerTray("root", registration);
  store.actions.openTray("root");
  store.actions.nextStep();

  const boundaryGeneration = store.getState().transitionGeneration;
  expect(store.getState().lastTransition?.fullScreenChanged).toBe(true);

  return { store, boundaryGeneration };
};

describe("fullscreen boundary navigation", () => {
  it("holds a same-mode step change until the boundary completes", () => {
    const { store, boundaryGeneration } = openAtBoundary();

    store.actions.nextStep();

    expect(store.getState().activeIndex).toBe(1);
    expect(store.getState().transitionGeneration).toBe(boundaryGeneration);

    store.transitions.mark(boundaryGeneration, "completed");

    expect(store.getState().activeIndex).toBe(2);
    expect(store.getState().lastTransition).toMatchObject({
      reason: "nextStep",
      fullScreenChanged: false,
      from: { stepKey: "full-one" },
      to: { stepKey: "full-two" },
    });
  });

  it("lets a boundary reverse at once, the boundary clock picks up the live frame", () => {
    const { store, boundaryGeneration } = openAtBoundary();

    store.actions.previousStep();

    expect(store.getState().activeIndex).toBe(0);
    expect(store.getState().transitionGeneration).toBeGreaterThan(
      boundaryGeneration,
    );
    expect(store.getState().lastTransition?.fullScreenChanged).toBe(true);
  });

  it("keeps only the latest held step change", () => {
    const { store, boundaryGeneration } = openAtBoundary();

    store.actions.nextStep();
    store.actions.nextStep();
    store.transitions.mark(boundaryGeneration, "completed");

    expect(store.getState().activeIndex).toBe(2);
    expect(store.transitions.getHistory()).toHaveLength(3);
  });

  it("drops a held step change when the tray closes first", () => {
    const { store } = openAtBoundary();

    store.actions.nextStep();
    store.actions.closeActiveTray();

    expect(store.getState().activeTrayId).toBeNull();
    expect(store.getState().stack).toHaveLength(0);
  });

  it("navigates at once when no boundary is in flight", () => {
    const { store, boundaryGeneration } = openAtBoundary();

    store.transitions.mark(boundaryGeneration, "completed");
    store.actions.nextStep();

    expect(store.getState().activeIndex).toBe(2);
  });
});
