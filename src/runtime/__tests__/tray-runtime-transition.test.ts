// verify navigation and registration preserve transition identity
import { describe, expect, it, jest } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";
import type { TrayPagesRegistration, TrayRegistration } from "../types";

// create the shared value shape used by runtime transition tests
const sharedValue = (value: number) => ({ value }) as SharedValue<number>;

// build a store with inert external dependencies
const createStore = (
  prepareKeyboardHandoff: () => void = () => undefined,
  anticipateKeyboard: () => void = () => undefined,
) =>
  createTrayRuntimeStore({
    anticipateKeyboard,
    prepareKeyboardHandoff,
    dismissFocusedInputs: () => undefined,
    registerFocusable: () => () => undefined,
  });

// build page registration data for fullscreen page transitions
const pages = (pageIndex: number): TrayPagesRegistration => ({
  stepKey: "fullscreen",
  pageIndex,
  totalPages: 4,
  hasFooter: false,
  canGoNext: pageIndex < 3,
  canGoBack: pageIndex > 0,
  nextPage: jest.fn(),
  backPage: jest.fn(),
  setPage: jest.fn(),
  progress: sharedValue(pageIndex),
});

describe("tray runtime transition ownership", () => {
  describe("[Decision Table] request-close policy", () => {
    const rules: {
      id: string;
      fullScreen: boolean;
      behavior: "dismiss" | "returnToShell";
      startIndex: number;
      expectedActive: boolean;
      expectedIndex: number;
      expectedReason: "dismiss" | "returnToShell";
    }[] = [
      {
        id: "AT-CLOSE-DT-001",
        fullScreen: false,
        behavior: "returnToShell",
        startIndex: 0,
        expectedActive: false,
        expectedIndex: 0,
        expectedReason: "dismiss",
      },
      {
        id: "AT-CLOSE-DT-002",
        fullScreen: true,
        behavior: "dismiss",
        startIndex: 1,
        expectedActive: false,
        expectedIndex: 0,
        expectedReason: "dismiss",
      },
      {
        id: "AT-CLOSE-DT-003",
        fullScreen: true,
        behavior: "returnToShell",
        startIndex: 0,
        expectedActive: false,
        expectedIndex: 0,
        expectedReason: "dismiss",
      },
      {
        id: "AT-CLOSE-DT-004",
        fullScreen: true,
        behavior: "returnToShell",
        startIndex: 1,
        expectedActive: true,
        expectedIndex: 0,
        expectedReason: "returnToShell",
      },
    ];

    it.each(rules)(
      "$id resolves to $expectedReason",
      ({ fullScreen, behavior, startIndex, expectedActive, expectedIndex, expectedReason }) => {
        const store = createStore();

        store.actions.registerTray("root", {
          steps: [
            {
              key: "shell",
              content: null,
              options: startIndex === 0
                ? { fullScreen, fullScreenCloseBehavior: behavior }
                : undefined,
            },
            {
              key: "task",
              content: null,
              options: { fullScreen, fullScreenCloseBehavior: behavior },
            },
          ],
        });
        store.actions.openTray("root");

        if (startIndex === 1) {
          store.actions.nextStep();
        }

        store.actions.requestCloseActiveTray();

        expect(store.getState().activeTrayId === "root").toBe(expectedActive);
        expect(store.getState().activeIndex).toBe(expectedIndex);
        expect(store.getState().lastTransition?.reason).toBe(expectedReason);
      },
    );
  });

  it("records step, page, nested, and close edges without changing navigation", () => {
    const store = createStore();
    const root: TrayRegistration = {
      steps: [
        { key: "sheet", content: null },
        {
          key: "fullscreen",
          content: null,
          options: { fullScreen: true },
        },
      ],
    };
    const nested: TrayRegistration = {
      steps: [{ key: "info", content: null }],
    };

    store.actions.registerTray("root", root);
    store.actions.registerTray("nested", nested);
    store.actions.openTray("root");
    store.actions.nextStep();

    expect(store.getState().activeIndex).toBe(1);
    expect(store.getState().lastTransition).toMatchObject({
      generation: 2,
      reason: "nextStep",
      boundary: "sheetToFullScreen",
    });

    store.actions.registerTrayPages("root", pages(0));
    const generationBeforePageChange = store.getState().transitionGeneration;
    store.actions.registerTrayPages("root", pages(1));

    expect(store.getState().activeIndex).toBe(1);
    expect(store.getState().transitionGeneration).toBe(
      generationBeforePageChange + 1,
    );
    expect(store.getState().lastTransition).toMatchObject({
      reason: "pageChange",
      direction: "forward",
      stepChanged: false,
      pageChanged: true,
      from: { stepKey: "fullscreen", pageIndex: 0 },
      to: { stepKey: "fullscreen", pageIndex: 1 },
    });

    store.actions.openNestedTray("nested", "root");

    expect(store.getState().activeTrayId).toBe("nested");
    expect(store.getState().lastTransition).toMatchObject({
      reason: "openNested",
      boundary: "opening",
      fullScreenChanged: false,
      from: { trayId: "root", stepKey: "fullscreen", pageIndex: 1 },
      to: { trayId: "nested", stepKey: "info" },
    });

    store.actions.closeActiveTray();

    expect(store.getState().activeTrayId).toBe("root");
    expect(store.getState().activeIndex).toBe(1);
    expect(store.getState().lastTransition).toMatchObject({
      reason: "closeNested",
      boundary: "closing",
      fullScreenChanged: false,
      from: { trayId: "nested", stepKey: "info" },
      to: { trayId: "root", stepKey: "fullscreen", pageIndex: 1 },
    });
  });

  it("does not manufacture a transition for clamped no-op navigation", () => {
    const store = createStore();

    store.actions.registerTray("single", {
      steps: [{ key: "only", content: null }],
    });
    store.actions.openTray("single");
    const transition = store.getState().lastTransition;
    const generation = store.getState().transitionGeneration;

    store.actions.nextStep();
    store.actions.previousStep();

    expect(store.getState().lastTransition).toBe(transition);
    expect(store.getState().transitionGeneration).toBe(generation);
  });

  it("hands native focus across adjacent sheet keyboard steps before navigation commits", () => {
    const prepareKeyboardHandoff = jest.fn();
    const store = createStore(prepareKeyboardHandoff);

    store.actions.registerTray("keyboard", {
      steps: [
        {
          key: "first-input",
          content: null,
          options: { keyboardAware: true },
        },
        {
          key: "second-input",
          content: null,
          options: { keyboardAware: true },
        },
      ],
    });
    store.actions.openTray("keyboard");

    store.actions.nextStep();

    expect(prepareKeyboardHandoff).toHaveBeenCalledTimes(1);
    expect(store.getState().activeIndex).toBe(1);
  });

  it("preloads before entering a keyboard-aware sheet step", () => {
    const anticipateKeyboard = jest.fn();
    const store = createStore(() => undefined, anticipateKeyboard);

    store.actions.registerTray("keyboard", {
      steps: [
        { key: "intro", content: null },
        {
          key: "input",
          content: null,
          options: { keyboardAware: true },
        },
      ],
    });
    store.actions.openTray("keyboard");

    store.actions.nextStep();

    expect(anticipateKeyboard).toHaveBeenCalledTimes(1);
    expect(store.getState().activeIndex).toBe(1);
  });

  it("does not preload when moving between keyboard-aware steps", () => {
    const anticipateKeyboard = jest.fn();
    const store = createStore(() => undefined, anticipateKeyboard);

    store.actions.registerTray("keyboard", {
      steps: [
        {
          key: "first-input",
          content: null,
          options: { keyboardAware: true },
        },
        {
          key: "second-input",
          content: null,
          options: { keyboardAware: true },
        },
      ],
    });
    store.actions.openTray("keyboard");

    store.actions.nextStep();

    expect(anticipateKeyboard).not.toHaveBeenCalled();
  });

  it("creates page intent before commit and reuses its generation", () => {
    const store = createStore();

    store.actions.registerTray("root", {
      steps: [
        {
          key: "fullscreen",
          content: null,
          options: { fullScreen: true },
        },
      ],
    });
    store.actions.openTray("root");
    store.actions.registerTrayPages("root", pages(0));

    const generation = store.actions.requestPageTransition(
      "root",
      "fullscreen",
      0,
      1,
    );

    expect(generation).not.toBeNull();
    expect(store.transitions.getActive()).toMatchObject({
      phase: "requested",
      contract: {
        generation,
        reason: "pageChange",
        from: { pageIndex: 0 },
        to: { pageIndex: 1 },
      },
    });

    store.actions.registerTrayPages("root", pages(1));

    expect(store.getState().transitionGeneration).toBe(generation);
    expect(store.getState().lastTransition?.generation).toBe(generation);
  });

  it("reconciles a pending step boundary when registration settles after navigation", () => {
    const store = createStore();

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        { key: "create", content: null },
      ],
    });
    store.actions.openTray("wallet");
    store.actions.nextStep();

    const generation = store.getState().transitionGeneration;
    expect(store.getState().lastTransition?.boundary).toBe("sheetToSheet");

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        {
          key: "create",
          content: null,
          options: { fullScreen: true },
        },
      ],
    });

    expect(store.getState().transitionGeneration).toBe(generation);
    expect(store.getState().lastTransition).toMatchObject({
      boundary: "sheetToFullScreen",
      fullScreenChanged: true,
      to: { mode: "fullScreen", stepKey: "create" },
    });
    expect(store.transitions.get(generation)?.contract).toMatchObject({
      boundary: "sheetToFullScreen",
      fullScreenChanged: true,
    });
  });

  it("reissues a generation when registration changes a sealed destination", () => {
    const store = createStore();

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        { key: "create", content: null },
      ],
    });
    store.actions.openTray("wallet");
    store.actions.nextStep();

    const sealedGeneration = store.getState().transitionGeneration;
    store.transitions.mark(sealedGeneration, "prepared");

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        {
          key: "create",
          content: null,
          options: { fullScreen: true },
        },
      ],
    });

    const reissuedGeneration = store.getState().transitionGeneration;

    expect(reissuedGeneration).toBeGreaterThan(sealedGeneration);
    expect(store.transitions.get(sealedGeneration)?.phase).toBe(
      "interrupted",
    );
    expect(store.getState().lastTransition).toMatchObject({
      generation: reissuedGeneration,
      boundary: "sheetToFullScreen",
      fullScreenChanged: true,
    });
  });

  it("does not reconcile a completed generation when registration changes", () => {
    const store = createStore();

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        { key: "create", content: null },
      ],
    });
    store.actions.openTray("wallet");
    store.actions.nextStep();

    const completedGeneration = store.getState().transitionGeneration;
    store.transitions.mark(completedGeneration, "completed");

    store.actions.registerTray("wallet", {
      steps: [
        { key: "chooser", content: null },
        {
          key: "create",
          content: null,
          options: { fullScreen: true },
        },
      ],
    });

    expect(store.getState().transitionGeneration).toBe(completedGeneration);
    expect(store.transitions.getActive()).toBeNull();
    expect(store.transitions.get(completedGeneration)?.contract.to?.mode).toBe(
      "sheet",
    );
  });

  it("interrupts a superseded transaction and rejects its late callbacks", () => {
    const store = createStore();

    store.actions.registerTray("root", {
      steps: [
        { key: "one", content: null },
        { key: "two", content: null },
        { key: "three", content: null },
      ],
    });
    store.actions.openTray("root");
    store.actions.nextStep();
    const supersededGeneration = store.getState().transitionGeneration;
    store.actions.nextStep();

    expect(store.transitions.get(supersededGeneration)?.phase).toBe(
      "interrupted",
    );
    expect(
      store.transitions.mark(supersededGeneration, "completed"),
    ).toBe(false);
  });
});
