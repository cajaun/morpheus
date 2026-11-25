// a step's footer draws pinned to the sheet bottom or inside an entering step's content until the step change completes
import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { TRAY_FOOTER_PADDING_TOP } from "../constants";
import TestRenderer, { act } from "react-test-renderer";

// motion is covered on device, these tests check placement and metrics
jest.mock("../../tray-step-content", () => ({
  TrayRevealedStepContent: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// eslint-disable-next-line import/first
import {
  createStepFooterStore,
  TrayContentFooterSlot,
  TrayStepFooterLayers,
  TrayStepFooterMetricsContext,
  TrayStepFooterStoreContext,
  type TrayStepFooterMetrics,
  type TrayStepFooterPayload,
} from "../step-footer";

const footer = <Text>Continue</Text>;

const payload = (
  trayId: string,
  key: string | null,
  overrides: Partial<TrayStepFooterPayload> = {},
): TrayStepFooterPayload => ({
  trayId,
  stepFooter: key ? footer : null,
  stepFooterKey: key,
  isFirstRender: false,
  fullScreen: false,
  transitionContract: { generation: 2 },
  ...overrides,
});

describe("step footer placement", () => {
  it("pins the footer of the opening step", () => {
    const store = createStepFooterStore();

    store.commit(payload("one", "id:go", { isFirstRender: true }));

    expect(store.getSnapshot().placement).toBe("pinned");
  });

  it("draws a returning footer in its step's content, then pins it", () => {
    const store = createStepFooterStore();

    store.commit(payload("three", "id:go", { isFirstRender: true }));
    store.commit(payload("four", null, { transitionContract: { generation: 3 } }));
    expect(store.getSnapshot().key).toBeNull();

    store.commit(payload("three", "id:go", { transitionContract: { generation: 4 } }));
    expect(store.getSnapshot()).toMatchObject({
      placement: "content",
      hostTrayId: "three",
      generation: 4,
    });

    // a stale completion leaves it entering
    store.settle(3);
    expect(store.getSnapshot().placement).toBe("content");

    store.settle(4);
    expect(store.getSnapshot()).toMatchObject({
      placement: "pinned",
      settled: true,
    });
  });

  it("keeps a shared footer pinned across steps", () => {
    const store = createStepFooterStore();

    store.commit(payload("one", "id:go", { isFirstRender: true }));
    store.commit(payload("two", "id:go", { transitionContract: { generation: 3 } }));

    expect(store.getSnapshot()).toMatchObject({
      placement: "pinned",
      hostTrayId: "two",
    });
  });

  it("fades a fullscreen step's footer in place", () => {
    const store = createStepFooterStore();

    store.commit(payload("one", null, { isFirstRender: true }));
    store.commit(payload("two", "default", { fullScreen: true }));

    expect(store.getSnapshot().placement).toBe("pinned");
  });
});

describe("step footer rendering", () => {
  const createMetrics = (): TrayStepFooterMetrics => ({
    heightRef: { current: 40 },
    height: { value: 40 } as TrayStepFooterMetrics["height"],
    remeasureContentRef: { current: null },
  });

  const tree = (
    store: ReturnType<typeof createStepFooterStore>,
    metrics: TrayStepFooterMetrics,
  ) => (
    <TrayStepFooterStoreContext.Provider value={store}>
      <TrayStepFooterMetricsContext.Provider value={metrics}>
        <TrayStepFooterLayers skipEntering={false} fullScreenBoundaryExit={false} />
        <TrayContentFooterSlot trayId="three" />
      </TrayStepFooterMetricsContext.Provider>
    </TrayStepFooterStoreContext.Provider>
  );

  it("draws the footer in exactly one place", () => {
    const store = createStepFooterStore();
    const metrics = createMetrics();
    let renderer!: TestRenderer.ReactTestRenderer;

    store.commit(payload("four", null, { isFirstRender: true }));
    act(() => {
      renderer = TestRenderer.create(tree(store, metrics));
    });

    // a step without a footer releases the reserve
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
    expect(metrics.heightRef.current).toBe(0);

    act(() => {
      store.commit(payload("three", "id:go", { transitionContract: { generation: 5 } }));
    });
    expect(renderer.root.findAllByType(Text)).toHaveLength(1);
    expect(store.getSnapshot().placement).toBe("content");

    act(() => {
      store.settle(5);
    });
    expect(renderer.root.findAllByType(Text)).toHaveLength(1);
    expect(store.getSnapshot().placement).toBe("pinned");
  });
});

describe("step footer backdrop", () => {
  it("paints the footer color from the footer's own top edge, not across its top padding", () => {
    const store = createStepFooterStore();
    let renderer!: TestRenderer.ReactTestRenderer;

    store.commit(
      payload("one", "id:go", {
        isFirstRender: true,
        footerStyle: { backgroundColor: "#FFFFFF", opacity: 0.9 },
      }),
    );

    act(() => {
      renderer = TestRenderer.create(
        <TrayStepFooterStoreContext.Provider value={store}>
          <TrayStepFooterLayers skipEntering={false} fullScreenBoundaryExit={false} />
        </TrayStepFooterStoreContext.Provider>,
      );
    });

    const flat = (style: unknown) => StyleSheet.flatten(style as any) ?? {};
    const views = renderer.root.findAll(
      (node) => typeof node.type !== "string" && node.props.style !== undefined,
    );
    const body = views.find(
      (node) => flat(node.props.style).paddingTop === TRAY_FOOTER_PADDING_TOP,
    );
    const backdrop = views.find(
      (node) => flat(node.props.style).backgroundColor === "#FFFFFF",
    );

    // the padded frame keeps every other style but no fill, so content passing behind shows above the footer
    expect(body).toBeDefined();
    expect(flat(body!.props.style).backgroundColor).toBeUndefined();
    expect(flat(body!.props.style).opacity).toBe(0.9);
    expect(flat(body!.props.style).overflow).toBe("hidden");
    expect(backdrop).toBeDefined();
    expect(flat(backdrop!.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
    });
  });
});
