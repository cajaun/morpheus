import { describe, expect, it } from "@jest/globals";
import type { TrayHostStateValue, TrayRegistration } from "../../types";
import { createTrayPresenterStateSelector } from "../presenter-state-selector";

const registration = (key: string): TrayRegistration => ({
  steps: [{ key, content: null }],
});

const state = (
  overrides: Partial<TrayHostStateValue> = {},
): TrayHostStateValue => ({
  registry: {},
  activeTrayId: null,
  activeIndex: 0,
  stack: [],
  transitionGeneration: 0,
  lastTransition: null,
  ...overrides,
});

describe("tray presenter state selector", () => {
  it("ignores registration changes for trays outside the presentation stack", () => {
    const select = createTrayPresenterStateSelector();
    const root = registration("root");
    const stack = [{ trayId: "root", index: 0 }];
    const first = select(
      state({ registry: { root }, stack }),
    );

    const second = select(
      state({
        registry: { root, inactiveNested: registration("nested") },
        stack,
      }),
    );

    expect(second).toBe(first);
  });

  it("publishes active registration changes", () => {
    const select = createTrayPresenterStateSelector();
    const stack = [{ trayId: "root", index: 0 }];
    const first = select(
      state({ registry: { root: registration("root") }, stack }),
    );

    const second = select(
      state({ registry: { root: registration("updated") }, stack }),
    );

    expect(second).not.toBe(first);
    expect(second.registry.root?.steps[0]?.key).toBe("updated");
  });

  it("ignores page-control registration changes for active presentations", () => {
    const select = createTrayPresenterStateSelector();
    const root = registration("root");
    const stack = [{ trayId: "root", index: 0 }];
    const first = select(state({ registry: { root }, stack }));

    const second = select(
      state({
        registry: {
          root: {
            ...root,
            pages: {
              stepKey: "root",
              pageIndex: 1,
              totalPages: 2,
              hasFooter: false,
              canGoNext: false,
              canGoBack: true,
              nextPage: () => undefined,
              backPage: () => undefined,
              setPage: () => undefined,
              progress: { value: 1 } as never,
            },
          },
        },
        stack,
      }),
    );

    expect(second).toBe(first);
  });

  it("publishes stack and transition changes", () => {
    const select = createTrayPresenterStateSelector();
    const root = registration("root");
    const first = select(
      state({
        registry: { root },
        stack: [{ trayId: "root", index: 0 }],
      }),
    );

    const second = select(
      state({
        registry: { root },
        stack: [{ trayId: "root", index: 1 }],
      }),
    );

    expect(second).not.toBe(first);
  });
});
