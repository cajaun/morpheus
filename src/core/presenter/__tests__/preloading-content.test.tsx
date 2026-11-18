// verify preloaded steps are reused instead of remounted, and that the step
// being left is removed (so it can animate out) rather than hidden
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React, { useEffect, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { resolveTrayStepOptions } from "../../../runtime/tray-step-options";
import type { PresentedPreloadedStep } from "../../../runtime/presenter/types";
import {
  resolveRenderedPreloadedSteps,
  TrayPreloadingContent,
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
    act(() => {
      TestRenderer.create(tree("one", ["two"], 1));
    });

    expect(mounts).toEqual({ one: 1, two: 1 });
    expect(effects).toEqual({ one: 1 });
  });

  it("reuses the preloaded step when it becomes current", () => {
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
    expect(mounts.three).toBe(1);
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
