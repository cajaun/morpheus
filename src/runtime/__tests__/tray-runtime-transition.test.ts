import { describe, expect, it, jest } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";
import type { TrayPagesRegistration, TrayRegistration } from "../types";

const sharedValue = (value: number) => ({ value }) as SharedValue<number>;

const createStore = () =>
  createTrayRuntimeStore({
    keyboardHeight: sharedValue(0),
    anticipateKeyboard: () => undefined,
    dismissFocusedInputs: () => undefined,
    registerFocusable: () => () => undefined,
  });

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
        expect(store.getState().transition?.reason).toBe(expectedReason);
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
    expect(store.getState().transition).toMatchObject({
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
    expect(store.getState().transition).toMatchObject({
      reason: "pageChange",
      direction: "forward",
      stepChanged: false,
      pageChanged: true,
      from: { stepKey: "fullscreen", pageIndex: 0 },
      to: { stepKey: "fullscreen", pageIndex: 1 },
    });

    store.actions.openNestedTray("nested", "root");

    expect(store.getState().activeTrayId).toBe("nested");
    expect(store.getState().transition).toMatchObject({
      reason: "openNested",
      from: { trayId: "root", stepKey: "fullscreen", pageIndex: 1 },
      to: { trayId: "nested", stepKey: "info" },
    });

    store.actions.closeActiveTray();

    expect(store.getState().activeTrayId).toBe("root");
    expect(store.getState().activeIndex).toBe(1);
    expect(store.getState().transition).toMatchObject({
      reason: "closeNested",
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
    const transition = store.getState().transition;
    const generation = store.getState().transitionGeneration;

    store.actions.nextStep();
    store.actions.previousStep();

    expect(store.getState().transition).toBe(transition);
    expect(store.getState().transitionGeneration).toBe(generation);
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
    expect(store.getState().transition?.generation).toBe(generation);
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
    expect(store.getState().transition?.boundary).toBe("sheetToSheet");

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
    expect(store.getState().transition).toMatchObject({
      boundary: "sheetToFullScreen",
      fullScreenChanged: true,
      to: { mode: "fullScreen", stepKey: "create" },
    });
    expect(store.transitions.get(generation)?.contract).toMatchObject({
      boundary: "sheetToFullScreen",
      fullScreenChanged: true,
    });
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
