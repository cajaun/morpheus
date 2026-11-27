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

describe("step footer pin hold", () => {
  const returning = () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-three", "id:continue", 0));
    store.commit(payload("tray-four", null, 4));
    store.commit(payload("tray-three", "id:continue", 5));
    return store;
  };

  it("keeps a touched entering footer in its content until the touch ends", () => {
    const store = returning();
    const release = store.holdPin();

    store.settle(5);
    expect(store.getSnapshot().placement).toBe("content");

    release();
    expect(store.getSnapshot().placement).toBe("pinned");
    expect(store.getSnapshot().settled).toBe(true);
  });

  it("pins at once when nothing holds it", () => {
    const store = returning();

    store.settle(5);
    expect(store.getSnapshot().placement).toBe("pinned");
  });

  it("does not pin a footer whose step changed while it was held", () => {
    const store = returning();
    const release = store.holdPin();

    store.settle(5);
    // the tap navigated, the same footer enters with the next step
    store.commit(payload("tray-two", "id:continue", 6));
    release();

    expect(store.getSnapshot().placement).toBe("content");
    store.settle(6);
    expect(store.getSnapshot().placement).toBe("pinned");
  });

  it("waits for every touch and ignores a repeated release", () => {
    const store = returning();
    const first = store.holdPin();
    const second = store.holdPin();

    store.settle(5);
    first();
    first();
    expect(store.getSnapshot().placement).toBe("content");

    second();
    expect(store.getSnapshot().placement).toBe("pinned");
  });

  it("still drops an exiting footer while an entering one is held", () => {
    const store = createStepFooterStore();
    store.commit(payload("tray-three", "id:continue", 0, "withContent"));
    store.commit(payload("tray-four", null, 4));
    const release = store.holdPin();

    store.settle(4);
    expect(store.getSnapshot().exiting).toBeNull();
    release();
  });

  it("drops holds from an earlier step change", () => {
    const store = returning();
    const stale = store.holdPin();

    store.settle(5);
    store.commit(payload("tray-two", "id:continue", 6));
    store.settle(6);
    expect(store.getSnapshot().placement).toBe("pinned");

    // the old touch ends after the footer already pinned for the next step
    stale();
    expect(store.getSnapshot().placement).toBe("pinned");
  });

  it("lets a new step's transition pin while an old touch is still unreleased", () => {
    const store = returning();
    store.holdPin();

    store.commit(payload("tray-two", "id:continue", 6));
    store.settle(6);

    expect(store.getSnapshot().placement).toBe("pinned");
  });
});
