import React from "react";
import { describe, expect, it } from "@jest/globals";
import {
  createStepFooterStore,
  type TrayStepFooterPayload,
} from "../placement-store";

const Footer = (_props: { exit?: "inPlace" | "withContent" }) => null;

const payload = (
  trayId: string,
  key: string | null,
  generation: number,
  exit?: "inPlace" | "withContent",
): TrayStepFooterPayload => ({
  trayId,
  stepFooterKey: key,
  stepFooter: key != null ? <Footer exit={exit} /> : null,
  isFirstRender: generation === 0,
  fullScreen: false,
  transitionContract: generation > 0 ? { generation } : null,
});

describe("step footer exit with content", () => {
  it("hands a withContent footer to the step it leaves with", () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-three", "id:continue", 0, "withContent"));
    store.commit(payload("tray-four", null, 4));

    const exiting = store.getSnapshot().exiting;

    expect(exiting?.key).toBe("id:continue");
    expect(exiting?.hostTrayId).toBe("tray-three");
    expect(exiting?.generation).toBe(4);
  });

  it("drops the exiting footer once its transition completes", () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-three", "id:continue", 0, "withContent"));
    store.commit(payload("tray-four", null, 4));
    store.settle(4);

    expect(store.getSnapshot().exiting).toBeNull();
  });

  it("keeps the in place fade by default", () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-three", "id:continue", 0));
    store.commit(payload("tray-four", null, 4));

    expect(store.getSnapshot().exit).toBe("inPlace");
    expect(store.getSnapshot().exiting).toBeNull();
  });

  it("never hands off a footer that has not settled into the pinned layer", () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-two", null, 0));
    store.commit(payload("tray-three", "id:continue", 3, "withContent"));
    store.commit(payload("tray-four", null, 4));

    // the entering copy already lives in step three's content and leaves with it
    expect(store.getSnapshot().exiting).toBeNull();
  });
});
