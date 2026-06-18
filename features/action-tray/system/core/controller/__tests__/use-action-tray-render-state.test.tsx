import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { useActionTrayRenderState } from "../use-action-tray-render-state";

describe("useActionTrayRenderState", () => {
  it("does not rerender when the latest snapshot is already committed", () => {
    const content = "content";
    let renderCount = 0;
    let state: ReturnType<typeof useActionTrayRenderState> | null = null;

    const Probe = () => {
      renderCount += 1;
      state = useActionTrayRenderState({
        content,
        trayId: "tray-step",
        fullScreen: false,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    const committedRenderCount = renderCount;

    act(() => {
      state!.actions.showLatestSnapshot();
      state!.actions.syncRenderedNodes("tray-step");
    });

    expect(renderCount).toBe(committedRenderCount);
  });

  it("advances fullscreen generations only when presentation mode changes", () => {
    let state: ReturnType<typeof useActionTrayRenderState> | null = null;

    const Probe = ({
      content,
      fullScreen,
    }: {
      content: string;
      fullScreen: boolean;
    }) => {
      state = useActionTrayRenderState({
        content,
        trayId: `tray-${content}`,
        fullScreen,
      });

      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Probe content="sheet-one" fullScreen={false} />,
      );
    });

    expect(state!.state.fullScreenTransitionGeneration).toBe(0);

    act(() => {
      renderer!.update(
        <Probe content="sheet-two" fullScreen={false} />,
      );
    });

    act(() => {
      state!.actions.showLatestSnapshot();
    });

    expect(state!.state.fullScreenTransitionGeneration).toBe(0);

    act(() => {
      renderer!.update(<Probe content="full" fullScreen />);
    });

    act(() => {
      state!.actions.showLatestSnapshot();
    });

    expect(state!.state.fullScreenTransitionGeneration).toBe(1);

    act(() => {
      renderer!.update(<Probe content="sheet-three" fullScreen={false} />);
    });

    act(() => {
      state!.actions.showLatestSnapshot();
    });

    expect(state!.state.fullScreenTransitionGeneration).toBe(2);

    act(() => {
      state!.actions.clear();
    });

    expect(state!.state.fullScreenTransitionGeneration).toBe(2);
  });
});
