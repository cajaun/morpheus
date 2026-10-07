import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import {
  PresentedStepWindow,
  type PresentedStepLayer,
} from "../presented-step-window";
import type {
  ResolvedTrayStepOptions,
  TrayTransitionContract,
} from "../../../runtime/types";

// Keep this test focused on layer ownership rather than Reanimated internals.
jest.mock("../../../tray-step-content", () => ({
  TrayStepContent: (() => {
    const mockReact = jest.requireActual("react") as typeof React;

    return ({
      children,
      onExitComplete,
      pointerEvents,
      stepKey,
      style,
    }: {
      children: React.ReactNode;
      onExitComplete?: () => void;
      pointerEvents?: "auto" | "none" | "box-none" | "box-only";
      stepKey?: string;
      style?: import("react-native").StyleProp<
        import("react-native").ViewStyle
      >;
    }) =>
      mockReact.createElement(
        "step-layer",
        {
          testID: `step-${stepKey}`,
          stepKey,
          onExitComplete,
          pointerEvents,
          style,
        },
        children,
      );
  })(),
}));

const stepOptions: ResolvedTrayStepOptions = {
  hasFooter: false,
  scale: true,
  keyboardAware: false,
  fullScreen: false,
  shouldScaleBackground: true,
  fullScreenBackgroundScale: 1,
  fullScreenDraggable: true,
  fullScreenCloseBehavior: "dismiss",
  fullScreenTransition: "morph",
  fullScreenSafeAreaTop: false,
};

const createTransition = (): TrayTransitionContract => ({
  generation: 1,
  reason: "nextStep",
  direction: "forward",
  boundary: "sheetToSheet",
  from: {
    trayId: "tray",
    stepIndex: 0,
    stepKey: "one",
    mode: "sheet",
  },
  to: {
    trayId: "tray",
    stepIndex: 1,
    stepKey: "two",
    mode: "sheet",
  },
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: false,
  sharedRegions: [],
});

const createLayer = (
  key: string,
  transitionContract: TrayTransitionContract | null,
): PresentedStepLayer => ({
  key,
  rootTrayId: "tray",
  content: <Text>{key}</Text>,
  stepOptions,
  fullScreenBoundaryExit: false,
  isFirstRender: key === "one",
  transitionContract,
  scale: true,
  anchorScaleToTop: false,
});

const renderedSteps = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    (node) =>
      typeof node.props.testID === "string" &&
      node.props.testID.startsWith("step-"),
  );

describe("PresentedStepWindow", () => {
  it("retains the outgoing step until its native exit completes", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <PresentedStepWindow
          active={createLayer("one", null)}
          region="content"
        />,
      );
    });

    act(() => {
      renderer!.update(
        <PresentedStepWindow
          active={createLayer("two", createTransition())}
          region="content"
        />,
      );
    });

    const transitionSteps = renderedSteps(renderer!);
    expect(transitionSteps.map((node) => node.props.stepKey)).toEqual([
      "one",
      "two",
    ]);
    expect(transitionSteps[0]!.props.pointerEvents).toBe("none");

    act(() => {
      transitionSteps[0]!.props.onExitComplete();
    });

    expect(renderedSteps(renderer!).map((node) => node.props.stepKey)).toEqual([
      "two",
    ]);
  });
});
