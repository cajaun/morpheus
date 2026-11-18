// verify a nested tray waits for its parent's transition to complete before
// asking for a prepared host, without timers
import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  TrayParentTransitionProvider,
  type TrayParentTransition,
  useParentTransitionSettled,
} from "../tray-parent-transition";

jest.mock("react-native-reanimated", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    // like Reanimated, react outside render; here after every commit
    useAnimatedReaction: (
      prepare: () => boolean,
      react: (value: boolean, previous: boolean | null) => void,
    ) => {
      ReactActual.useEffect(() => {
        react(prepare(), null);
      });
    },
  };
});

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (fn: () => void) => fn(),
}));

const shared = (value: number) =>
  ({ value }) as TrayParentTransition["completedGeneration"];

const renderSettled = (parent: TrayParentTransition | null) => {
  let settled: boolean | undefined;
  const Probe = () => {
    settled = useParentTransitionSettled();
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <TrayParentTransitionProvider value={parent}>
        <Probe />
      </TrayParentTransitionProvider>,
    );
  });

  return {
    settled: () => settled,
    rerender: () =>
      act(() => {
        renderer.update(
          <TrayParentTransitionProvider value={parent}>
            <Probe />
          </TrayParentTransitionProvider>,
        );
      }),
  };
};

describe("useParentTransitionSettled", () => {
  it("is settled outside a parent transition", () => {
    expect(renderSettled(null).settled()).toBe(true);
    expect(
      renderSettled({ generation: 0, completedGeneration: shared(0) }).settled(),
    ).toBe(true);
  });

  it("waits for the parent's generation to complete", () => {
    const completedGeneration = shared(3);
    const probe = renderSettled({ generation: 4, completedGeneration });

    expect(probe.settled()).toBe(false);

    completedGeneration.value = 4;
    probe.rerender();

    expect(probe.settled()).toBe(true);
  });
});
