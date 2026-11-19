// verify preloaded steps are reused instead of remounted, and that the step
// being left is removed (so it can animate out) rather than hidden
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React, { useEffect, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { resolveTrayStepOptions } from "../../../runtime/tray-step-options";
import type { PresentedPreloadedStep } from "../../../runtime/presenter/types";
import {
  resolveRenderedPreloadedHeaders,
  resolveRenderedPreloadedSteps,
  TrayPreloadingContent,
  TrayPreloadingHeader,
} from "../preloading-content";

let mockCompletedGeneration = 0;

jest.mock("../../../runtime/tray-parent-transition", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");
  const context = ReactActual.createContext<{ generation: number } | null>(
    null,
  );

  return {
    TrayParentTransitionContext: context,
    TrayParentTransitionProvider: context.Provider,
    useParentCompletedGeneration: () => mockCompletedGeneration,
  };
});

// the reveal animation itself is covered by the content's own behaviour on
// device; here only the layer identity matters
jest.mock("../../../tray-step-content", () => ({
  TrayRevealedStepContent: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// eslint-disable-next-line import/first
import { TrayParentTransitionProvider } from "../../../runtime/tray-parent-transition";

const mounts: Record<string, number> = {};
const effects: Record<string, number> = {};

const StepBody = ({ name }: { name: string }) => {
  useState(() => {
    mounts[name] = (mounts[name] ?? 0) + 1;
    return null;
  });
  useEffect(() => {
    effects[name] = (effects[name] ?? 0) + 1;
  }, [name]);
  return null;
};

const options = resolveTrayStepOptions({ preload: true });
const bodies = {
  one: <StepBody name="one" />,
  two: <StepBody name="two" />,
  three: <StepBody name="three" />,
};
const preloadStep = (key: keyof typeof bodies): PresentedPreloadedStep => ({
  trayId: `flow-${key}`,
  header: null,
  content: bodies[key],
  stepOptions: options,
});

const tree = (
  current: keyof typeof bodies,
  preloaded: (keyof typeof bodies)[],
  generation: number,
) => (
  <TrayParentTransitionProvider value={{ generation } as never}>
    <TrayPreloadingContent
      current={{
        trayId: `flow-${current}`,
        content: bodies[current],
        stepOptions: options,
        fullScreen: false,
        fullScreenBoundaryExit: false,
        isFirstRender: false,
      }}
      preloaded={preloaded.map(preloadStep)}
    />
  </TrayParentTransitionProvider>
);

describe("TrayPreloadingContent", () => {
  beforeEach(() => {
    mockCompletedGeneration = 0;
    for (const key of Object.keys(mounts)) delete mounts[key];
    for (const key of Object.keys(effects)) delete effects[key];
  });

  it("renders the next step ahead of time without running its effects", () => {
    mockCompletedGeneration = 1;
    act(() => {
      TestRenderer.create(tree("one", ["two"], 1));
    });

    expect(mounts).toEqual({ one: 1, two: 1 });
    expect(effects).toEqual({ one: 1 });
  });

  it("reuses the preloaded step when it becomes current", () => {
    mockCompletedGeneration = 1;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(tree("one", ["two"], 1));
    });

    act(() => {
      renderer.update(tree("two", ["three"], 2));
    });

    // two was mounted once, while hidden, and its effects ran on reveal
    expect(mounts.two).toBe(1);
    expect(effects.two).toBe(1);
  });

  it("preloads a newly needed step only once the transition finishes", () => {
    mockCompletedGeneration = 1;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(tree("one", ["two"], 1));
    });

    // moving to two: three is needed now, but rendering it would compete
    // with the transition starting, so it waits
    act(() => {
      renderer.update(tree("two", ["three"], 2));
    });
    expect(mounts.three).toBeUndefined();

    mockCompletedGeneration = 2;
    act(() => {
      renderer.update(tree("two", ["three"], 2));
    });
    expect(mounts.three).toBe(1);
    expect(effects.three).toBeUndefined();
  });

  it("reuses the previous step when navigating back", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(tree("one", ["two"], 1));
    });
    act(() => {
      renderer.update(tree("two", ["three", "one"], 2));
    });

    // one is the step just left: removed until the forward transition ends,
    // then rendered hidden again as the previous step
    expect(mounts.one).toBe(1);
    mockCompletedGeneration = 2;
    act(() => {
      renderer.update(tree("two", ["three", "one"], 2));
    });
    expect(mounts.one).toBe(2);
    expect(effects.one).toBe(1);

    // back to one reuses that hidden instance instead of mounting it
    act(() => {
      renderer.update(tree("one", ["two"], 3));
    });
    expect(mounts.one).toBe(2);
    expect(effects.one).toBe(2);
    expect(mounts.two).toBe(1);
  });

  it("removes the step being left until its transition completes", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(tree("two", [], 1));
    });

    // back to one: two would be the preloaded next step again, but it is the
    // step being left, so it is removed (to animate out), not hidden
    act(() => {
      renderer.update(tree("one", ["two"], 2));
    });
    expect(mounts.two).toBe(1);

    // once the transition that left it completes, it is preloaded again
    mockCompletedGeneration = 2;
    act(() => {
      renderer.update(tree("one", ["two"], 2));
    });
    expect(mounts.two).toBe(2);
    expect(effects.two).toBe(1);
  });
});

describe("hidden layer content", () => {
  const renders: string[] = [];
  const Field = ({ value }: { value: string }) => {
    renders.push(value);
    return null;
  };
  const step = (
    key: string,
    value: string,
  ): PresentedPreloadedStep => ({
    trayId: `typing-${key}`,
    header: null,
    content: <Field value={`${key}:${value}`} />,
    stepOptions: options,
  });
  const typingTree = (
    current: string,
    next: string,
    value: string,
  ) => (
    <TrayParentTransitionProvider value={{ generation: 1 } as never}>
      <TrayPreloadingContent
        current={{
          trayId: `typing-${current}`,
          content: <Field value={`${current}:${value}`} />,
          stepOptions: options,
          fullScreen: false,
          fullScreenBoundaryExit: false,
          isFirstRender: false,
        }}
        preloaded={[step(next, value)]}
      />
    </TrayParentTransitionProvider>
  );

  beforeEach(() => {
    mockCompletedGeneration = 1;
    renders.length = 0;
  });

  it("does not re-render a hidden step when the parent's state changes", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(typingTree("address", "details", ""));
    });
    renders.length = 0;

    act(() => {
      renderer.update(typingTree("address", "details", "b"));
    });

    expect(renders).toEqual(["address:b"]);
  });

  it("shows the latest content once the hidden step is revealed", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(typingTree("address", "details", ""));
    });
    act(() => {
      renderer.update(typingTree("address", "details", "ben"));
    });
    renders.length = 0;

    act(() => {
      renderer.update(typingTree("details", "address", "ben"));
    });

    // the held element is shown first, then the latest content renders
    expect(renders).toContain("details:ben");
    expect(renders[renders.length - 1]).not.toBe("details:");
  });
});

describe("resolveRenderedPreloadedSteps", () => {
  const steps = [preloadStep("two"), preloadStep("three")];

  it("never renders the current step as a hidden layer", () => {
    expect(
      resolveRenderedPreloadedSteps(steps, "flow-two", null, 0).map(
        (step) => step.trayId,
      ),
    ).toEqual(["flow-three"]);
  });

  it("holds the left step out until its generation completes", () => {
    const left = { trayId: "flow-two", generation: 4 };

    expect(
      resolveRenderedPreloadedSteps(steps, "flow-one", left, 3).map(
        (step) => step.trayId,
      ),
    ).toEqual(["flow-three"]);
    expect(
      resolveRenderedPreloadedSteps(steps, "flow-one", left, 4).map(
        (step) => step.trayId,
      ),
    ).toEqual(["flow-two", "flow-three"]);
  });

  it("keeps a left step held out when its transition has no completion signal", () => {
    expect(
      resolveRenderedPreloadedSteps(
        steps,
        "flow-one",
        { trayId: "flow-two", generation: 0 },
        99,
      ).map((step) => step.trayId),
    ).toEqual(["flow-three"]);
  });
});

describe("TrayPreloadingHeader", () => {
  const sheetOptions = resolveTrayStepOptions({});
  const fullScreenOptions = resolveTrayStepOptions({ fullScreen: true });
  const headers = {
    one: <StepBody name="header-one" />,
    two: <StepBody name="header-two" />,
    three: <StepBody name="header-three" />,
  };
  const fullScreenSteps = new Set(["two"]);
  const stepOptionsFor = (key: keyof typeof headers) =>
    fullScreenSteps.has(key) ? fullScreenOptions : sheetOptions;
  const headerStep = (key: keyof typeof headers): PresentedPreloadedStep => ({
    trayId: `flow-${key}`,
    header: headers[key],
    content: null,
    stepOptions: stepOptionsFor(key),
  });
  const headerTree = (
    current: keyof typeof headers,
    preloaded: (keyof typeof headers)[],
    generation: number,
  ) => (
    <TrayParentTransitionProvider value={{ generation } as never}>
      <TrayPreloadingHeader
        current={{
          trayId: `flow-${current}`,
          header: headers[current],
          stepOptions: stepOptionsFor(current),
          fullScreen: fullScreenSteps.has(current),
          fullScreenBoundaryExit: false,
          isFirstRender: false,
        }}
        preloaded={preloaded.map(headerStep)}
      />
    </TrayParentTransitionProvider>
  );

  beforeEach(() => {
    mockCompletedGeneration = 0;
    for (const key of Object.keys(mounts)) delete mounts[key];
    for (const key of Object.keys(effects)) delete effects[key];
  });

  it("preloads each neighbour header that is in the other mode", () => {
    expect(
      resolveRenderedPreloadedHeaders(
        [headerStep("two"), headerStep("one")],
        "fixed-header",
        null,
        0,
      ).map((layer) => layer.key),
    ).toEqual(["fullscreen-header#flow-two"]);

    // both neighbours are sheet steps: each keeps its own hidden header, so
    // going either way reuses the header rendered for that step
    expect(
      resolveRenderedPreloadedHeaders(
        [headerStep("three"), headerStep("one")],
        "fullscreen-header",
        null,
        0,
      ).map((layer) => layer.key),
    ).toEqual(["fixed-header#flow-three", "fixed-header#flow-one"]);
  });

  it("reuses the preloaded fullscreen header across the boundary", () => {
    mockCompletedGeneration = 1;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(headerTree("one", ["two"], 1));
    });
    expect(mounts["header-two"]).toBe(1);
    expect(effects["header-two"]).toBeUndefined();

    act(() => {
      renderer.update(headerTree("two", ["three", "one"], 2));
    });
    expect(mounts["header-two"]).toBe(1);
    expect(effects["header-two"]).toBe(1);
  });

  it("reuses the header kept for the step being returned to", () => {
    mockCompletedGeneration = 1;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(headerTree("two", ["three", "one"], 1));
    });
    expect(mounts["header-one"]).toBe(1);
    expect(mounts["header-three"]).toBe(1);

    // back to one: its own hidden header is shown, not three's
    act(() => {
      renderer.update(headerTree("one", ["two"], 2));
    });
    expect(mounts["header-one"]).toBe(1);
    expect(effects["header-one"]).toBe(1);
    expect(effects["header-three"]).toBeUndefined();
  });
});

describe("step layer", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useTrayStepLayer } = require(
    "../../../runtime/tray-context",
  ) as typeof import("../../../runtime/tray-context");
  const seen: (string | null)[] = [];
  const LayerReader = () => {
    seen.push(useTrayStepLayer());
    return null;
  };

  it("tells each kept-rendered step which step it belongs to", () => {
    mockCompletedGeneration = 1;
    seen.length = 0;
    const layerStep = (key: string): PresentedPreloadedStep => ({
      trayId: `flow-${key}`,
      header: null,
      content: <LayerReader />,
      stepOptions: options,
    });

    act(() => {
      TestRenderer.create(
        <TrayParentTransitionProvider value={{ generation: 1 } as never}>
          <TrayPreloadingContent
            current={{
              trayId: "flow-one",
              content: <LayerReader />,
              stepOptions: options,
              fullScreen: false,
              fullScreenBoundaryExit: false,
              isFirstRender: false,
            }}
            preloaded={[layerStep("two")]}
          />
        </TrayParentTransitionProvider>,
      );
    });

    expect(seen).toEqual(["flow-one", "flow-two"]);
  });
});
