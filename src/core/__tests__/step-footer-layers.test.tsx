// a step's footer draws pinned to the sheet bottom or inside an entering step's content until the step change completes
import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { TRAY_FOOTER_PADDING_TOP } from "../constants";
import {
  resolveFooterBackingHeight,
  resolveFooterFadeImage,
} from "../footer-backdrop";
import TestRenderer, { act } from "react-test-renderer";

// animated styles resolve to plain objects so geometry is readable
jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<object>("react-native-reanimated/mock"),
  useAnimatedStyle: (updater: () => object) => updater(),
}));

// motion is covered on device, these tests check placement and metrics
jest.mock("../../tray-step-content", () => ({
  TrayRevealedStepContent: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// eslint-disable-next-line import/first
import {
  createStepFooterStore,
  TrayContentFooterSlot,
  TrayStepFooterBacking,
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

describe("step footer backing", () => {
  const flat = (style: unknown) => StyleSheet.flatten(style as any) ?? {};
  const styledViews = (renderer: TestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(
      (node) => typeof node.type !== "string" && node.props.style !== undefined,
    );
  const pinnedStore = () => {
    const store = createStepFooterStore();

    store.commit(
      payload("one", "id:go", {
        isFirstRender: true,
        footerStyle: { backgroundColor: "#FFFFFF", opacity: 0.9 },
      }),
    );

    return store;
  };

  it("draws no fill on the pinned footer, which sits outside the sheet", () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrayStepFooterStoreContext.Provider value={pinnedStore()}>
          <TrayStepFooterLayers skipEntering={false} fullScreenBoundaryExit={false} />
        </TrayStepFooterStoreContext.Provider>,
      );
    });

    const views = styledViews(renderer);
    const body = views.find(
      (node) => flat(node.props.style).paddingTop === TRAY_FOOTER_PADDING_TOP,
    );

    // a second rounded fill over the sheet's edge would draw its corners twice
    expect(body).toBeDefined();
    expect(flat(body!.props.style).backgroundColor).toBeUndefined();
    expect(flat(body!.props.style).opacity).toBe(0.9);
    expect(
      views.some((node) => flat(node.props.style).backgroundColor === "#FFFFFF"),
    ).toBe(false);
  });

  it("backs the pinned footer from inside the sheet, solid from its controls' top edge with a fade above", () => {
    const metrics: TrayStepFooterMetrics = {
      heightRef: { current: 120 },
      height: { value: 120 } as TrayStepFooterMetrics["height"],
      remeasureContentRef: { current: null },
    };
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrayStepFooterStoreContext.Provider value={pinnedStore()}>
          <TrayStepFooterMetricsContext.Provider value={metrics}>
            <TrayStepFooterBacking frameStyle={{ bottom: 0 }} />
          </TrayStepFooterMetricsContext.Provider>
        </TrayStepFooterStoreContext.Provider>,
      );
    });

    const views = styledViews(renderer);
    const fill = views.find(
      (node) => flat(node.props.style).backgroundColor === "#FFFFFF",
    );
    const anchor = views.find(
      (node) =>
        flat(node.props.style).position === "absolute" &&
        flat(node.props.style).height === 0 &&
        flat(node.props.style).bottom === 0,
    );

    expect(anchor).toBeDefined();
    expect(fill).toBeDefined();
    expect(flat(fill!.props.style)).toMatchObject({
      position: "absolute",
      bottom: 0,
      // solid from the controls' top edge, the top padding above holds the fade
      height: 120 - TRAY_FOOTER_PADDING_TOP,
    });

    const fade = views.find(
      (node) => flat(node.props.style).experimental_backgroundImage !== undefined,
    );

    expect(fade).toBeDefined();
    expect(flat(fade!.props.style)).toMatchObject({
      position: "absolute",
      // directly above the solid backing, filling the top padding
      bottom: "100%",
      experimental_backgroundImage: resolveFooterFadeImage("#FFFFFF"),
    });
  });

  it("keeps a footer drawn in its step's content covering what passes behind it", () => {
    const store = createStepFooterStore();
    let renderer!: TestRenderer.ReactTestRenderer;

    store.commit(payload("three", "id:go", { isFirstRender: true }));
    store.commit(payload("four", null, { transitionContract: { generation: 3 } }));
    store.commit(
      payload("three", "id:go", {
        transitionContract: { generation: 4 },
        footerStyle: { backgroundColor: "#FFFFFF" },
      }),
    );

    act(() => {
      renderer = TestRenderer.create(
        <TrayStepFooterStoreContext.Provider value={store}>
          <TrayContentFooterSlot trayId="three" />
        </TrayStepFooterStoreContext.Provider>,
      );
    });

    const backdrop = styledViews(renderer).find(
      (node) => flat(node.props.style).backgroundColor === "#FFFFFF",
    );

    expect(backdrop).toBeDefined();
    expect(flat(backdrop!.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
    });
    expect(
      styledViews(renderer).some(
        (node) =>
          flat(node.props.style).experimental_backgroundImage !== undefined,
      ),
    ).toBe(true);
  });
});

describe("footer backing height", () => {
  it("is solid from the controls' top edge to the footer's bottom", () => {
    // a 50pt button between 28pt paddings is backed from its top edge down
    expect(resolveFooterBackingHeight(106, 28)).toBe(78);
    // a footer still collapsing into its trigger has no top padding yet
    expect(resolveFooterBackingHeight(50, 0)).toBe(50);
    expect(resolveFooterBackingHeight(0, 28)).toBe(0);
  });

  it("fades from the backing color at no opacity to the backing color", () => {
    // never through another color, so the fade cannot darken mid-way
    expect(resolveFooterFadeImage("#FFFFFF")).toBe(
      "linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1))",
    );
    expect(resolveFooterFadeImage("rgba(18, 52, 86, 0.5)")).toBe(
      "linear-gradient(to bottom, rgba(18, 52, 86, 0), rgba(18, 52, 86, 0.5019607843137255))",
    );
    expect(resolveFooterFadeImage(undefined)).toBeUndefined();
  });
});
