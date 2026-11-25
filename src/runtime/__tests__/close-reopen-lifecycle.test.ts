// a close cut short by a reopen still ends in the ledger, the reopen marks it interrupted
import { describe, expect, it } from "@jest/globals";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";

describe("close then reopen", () => {
  it("marks the cut-short close interrupted", () => {
    const store = createTrayRuntimeStore({
      anticipateKeyboard: () => undefined,
      prepareKeyboardHandoff: () => undefined,
      dismissFocusedInputs: () => undefined,
      registerFocusable: () => () => undefined,
    });

    store.actions.registerTray("root", {
      steps: [{ key: "only", content: null }],
    });
    store.actions.openTray("root");
    store.actions.closeActiveTray();

    const closeGeneration = store.getState().transitionGeneration;

    store.actions.openTray("root");

    expect(store.transitions.get(closeGeneration)?.phase).toBe("interrupted");
    expect(store.transitions.getActive()?.contract.reason).toBe("open");
  });
});
