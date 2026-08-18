import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { useActionTrayRenderState } from "../use-action-tray-render-state";

// probe committed render snapshots without mounting the animated shell
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

  it("uses a neutral fullscreen background scale when no override is set", () => {
    let state: ReturnType<typeof useActionTrayRenderState> | null = null;

    const Probe = () => {
      state = useActionTrayRenderState({
        content: "content",
        trayId: "tray-step",
        fullScreen: true,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    expect(state!.state.renderedFullScreenBackgroundScale).toBe(1);
  });

});
