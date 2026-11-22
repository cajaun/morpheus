import React from "react";
import { Text } from "react-native";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { TrayHeaderRow } from "../header";
import { TrayHeaderTransitionProvider } from "../header-transition-context";

// animated header participants stay on Reanimated, static containers are plain native views kept unflattened
describe("TrayHeaderRow transition structure", () => {
  it("keeps animated layers animated and static containers as unflattened views", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrayHeaderTransitionProvider
          value={{
            stepKey: "step",
            skipEntering: false,
            fullScreenBoundaryExit: false,
          }}
        >
          <TrayHeaderRow left={<Text>back</Text>} right={<Text>close</Text>}>
            <Text>Title</Text>
          </TrayHeaderRow>
        </TrayHeaderTransitionProvider>,
      );
    });

    const root = renderer!.root;
    const transitionLayers = root.findAll(
      (node) =>
        typeof node.type === "function" &&
        (node.type as { name?: string }).name === "TrayStepContent",
    );
    const staticContainers = root.findAll(
      (node) =>
        typeof node.type === "string" &&
        node.props.collapsable === false &&
        node.props.entering === undefined,
    );
    const reanimatedViews = root.findAll(
      (node) =>
        typeof node.type !== "string" &&
        /^AnimatedComponent/.test(
          (node.type as { displayName?: string }).displayName ?? "",
        ),
    );
    const rowWithLayout = root.findAll(
      (node) =>
        typeof node.type === "string" &&
        node.props.collapsable === false &&
        typeof node.props.onLayout === "function",
    );

    // title and action groups run the synchronized enter and exit motion
    expect(transitionLayers.length).toBe(2);
    // the title layer and the two transition layers mount through Reanimated, static containers do not
    expect(reanimatedViews.length).toBe(3);
    // row, title viewport and both control slots stay real native views
    expect(staticContainers.length).toBeGreaterThanOrEqual(4);
    // the row and the title layer report layout for title centering
    expect(rowWithLayout.length).toBeGreaterThanOrEqual(1);
    expect(root.findAllByType(Text).map((node) => node.props.children)).toEqual(
      expect.arrayContaining(["Title", "back", "close"]),
    );
  });
});
