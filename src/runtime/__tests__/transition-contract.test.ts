import { describe, expect, it } from "@jest/globals";
import type {
  TrayPresentationEndpoint,
  TrayRegistration,
} from "../types";
import {
  createTrayTransitionContract,
  resolveTrayPresentationEndpoint,
} from "../transition-contract";
import {
  hasAdjacentFullScreenBoundary,
  resolveTrayAnimationContract,
} from "../presenter/animation-contract";

const endpoint = (
  stepIndex: number,
  mode: TrayPresentationEndpoint["mode"],
  pageIndex?: number,
): TrayPresentationEndpoint => ({
  trayId: "onboarding",
  stepIndex,
  stepKey: `step-${stepIndex}`,
  pageIndex,
  mode,
});

const registration: TrayRegistration = {
  steps: [
    { key: "step-0", content: null },
    { key: "step-1", content: null, options: { fullScreen: true } },
    { key: "step-2", content: null },
  ],
};

describe("tray transition contract", () => {
  it("records the actual step direction and fullscreen boundary", () => {
    const transition = createTrayTransitionContract({
      generation: 4,
      reason: "nextStep",
      from: endpoint(0, "sheet"),
      to: endpoint(1, "fullScreen"),
    });

    expect(transition).toMatchObject({
      generation: 4,
      direction: "forward",
      boundary: "sheetToFullScreen",
      stepChanged: true,
      pageChanged: false,
      fullScreenChanged: true,
    });
  });

  it("records page movement without pretending the shell step changed", () => {
    const transition = createTrayTransitionContract({
      generation: 5,
      reason: "pageChange",
      from: endpoint(1, "fullScreen", 2),
      to: endpoint(1, "fullScreen", 3),
    });

    expect(transition).toMatchObject({
      direction: "forward",
      boundary: "fullScreenToFullScreen",
      stepChanged: false,
      pageChanged: true,
      fullScreenChanged: false,
    });
  });

  it("includes a registered page only when it belongs to the active step", () => {
    const withPages: TrayRegistration = {
      ...registration,
      pages: {
        stepKey: "step-1",
        pageIndex: 3,
        totalPages: 4,
        hasFooter: false,
        canGoNext: false,
        canGoBack: true,
        nextPage: () => undefined,
        backPage: () => undefined,
        setPage: () => undefined,
        progress: { value: 3 } as never,
      },
    };

    expect(
      resolveTrayPresentationEndpoint({
        entry: { trayId: "onboarding", index: 1 },
        registration: withPages,
      })?.pageIndex,
    ).toBe(3);
    expect(
      resolveTrayPresentationEndpoint({
        entry: { trayId: "onboarding", index: 2 },
        registration: withPages,
      })?.pageIndex,
    ).toBeUndefined();
  });

  it("preserves the established adjacent-boundary animation policy", () => {
    expect(hasAdjacentFullScreenBoundary(registration, 0)).toBe(true);
    expect(hasAdjacentFullScreenBoundary(registration, 1)).toBe(true);
    expect(hasAdjacentFullScreenBoundary(registration, 2)).toBe(true);

    const actualTransition = createTrayTransitionContract({
      generation: 2,
      reason: "nextStep",
      from: endpoint(0, "sheet"),
      to: endpoint(1, "fullScreen"),
    });
    const animation = resolveTrayAnimationContract({
      registration,
      endpoint: endpoint(1, "fullScreen"),
      previousIndex: 0,
      transition: actualTransition,
    });

    expect(animation.transition).toBe(actualTransition);
    expect(animation.isFirstRender).toBe(false);
    expect(animation.fullScreenBoundaryExit).toBe(true);
  });

  it("keeps a step transition when its Tray.Pages tree registers after presentation", () => {
    const transition = createTrayTransitionContract({
      generation: 8,
      reason: "nextStep",
      from: endpoint(0, "sheet"),
      // the target page is not registered when the runtime first resolves the
      // step boundary
      to: endpoint(1, "fullScreen"),
    });

    const animation = resolveTrayAnimationContract({
      registration,
      endpoint: endpoint(1, "fullScreen", 0),
      previousIndex: 0,
      transition,
    });

    expect(animation.transition).toBe(transition);
  });
});
