import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import {
  useTrayRenderSnapshotRegion,
  useTrayRenderState,
} from "../use-tray-render-state";

// probe committed render snapshots without mounting the animated shell
describe("useTrayRenderState", () => {
  it("does not rerender when the latest snapshot is already committed", () => {
    const content = "content";
    let renderCount = 0;
    let state: ReturnType<typeof useTrayRenderState> | null = null;

    const Probe = () => {
      renderCount += 1;
      state = useTrayRenderState({
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

  it("publishes same-mode step content without rerendering the controller host", () => {
    let renderCount = 0;
    let state: ReturnType<typeof useTrayRenderState> | null = null;
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    const Probe = ({ trayId }: { trayId: string }) => {
      renderCount += 1;
      state = useTrayRenderState({
        content: `content-${trayId}`,
        trayId,
        fullScreen: false,
      });
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(<Probe trayId="step-one" />);
    });

    act(() => {
      renderer!.update(<Probe trayId="step-two" />);
    });
    const renderCountBeforeSnapshotPublication = renderCount;

    act(() => {
      state!.actions.showLatestSnapshot();
    });

    expect(renderCount).toBe(renderCountBeforeSnapshotPublication);
    expect(state!.snapshotStore.getSnapshot().trayId).toBe("step-two");
    expect(state!.snapshotStore.getSnapshot().content).toBe("content-step-two");
  });

  it("publishes same-tray region changes without rerendering the shell host", () => {
    let renderCount = 0;
    let state: ReturnType<typeof useTrayRenderState> | null = null;
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    const Probe = ({ content }: { content: string }) => {
      renderCount += 1;
      state = useTrayRenderState({
        content,
        trayId: "tray-step",
        fullScreen: false,
      });
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(<Probe content="content-one" />);
    });

    act(() => {
      renderer!.update(<Probe content="content-two" />);
    });
    const renderCountBeforeSnapshotPublication = renderCount;

    act(() => {
      state!.actions.syncRenderedNodes("tray-step");
    });

    expect(renderCount).toBe(renderCountBeforeSnapshotPublication);
    expect(state!.snapshotStore.getSnapshot().content).toBe("content-two");
  });

  it("only notifies the snapshot region whose node changed", () => {
    let state: ReturnType<typeof useTrayRenderState> | null = null;
    const regionRenderCounts = {
      header: 0,
      content: 0,
      footer: 0,
    };

    const RegionProbe = React.memo(
      ({
        store,
        region,
      }: {
        store: NonNullable<typeof state>["snapshotStore"];
        region: "header" | "content" | "footer";
      }) => {
        useTrayRenderSnapshotRegion(store, region);
        regionRenderCounts[region] += 1;
        return null;
      },
    );
    RegionProbe.displayName = "RegionProbe";

    const Probe = ({ content }: { content: string }) => {
      state = useTrayRenderState({
        header: "header",
        content,
        footer: "footer",
        trayId: "tray-step",
        fullScreen: false,
      });

      return (
        <>
          <RegionProbe store={state.snapshotStore} region="header" />
          <RegionProbe store={state.snapshotStore} region="content" />
          <RegionProbe store={state.snapshotStore} region="footer" />
        </>
      );
    };

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<Probe content="content-one" />);
    });

    act(() => {
      renderer!.update(<Probe content="content-two" />);
    });

    act(() => {
      state!.actions.syncRenderedNodes("tray-step");
    });

    expect(regionRenderCounts).toEqual({
      header: 1,
      content: 2,
      footer: 1,
    });
  });

  it("uses a neutral fullscreen background scale when no override is set", () => {
    let state: ReturnType<typeof useTrayRenderState> | null = null;

    const Probe = () => {
      state = useTrayRenderState({
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

  it("keeps committed body regions through a transient same-mode prop gap", () => {
    let state: ReturnType<typeof useTrayRenderState> | null = null;
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    const Probe = ({
      content,
      header,
      footer,
    }: {
      content?: React.ReactNode;
      header?: React.ReactNode;
      footer?: React.ReactNode;
    }) => {
      state = useTrayRenderState({
        content,
        header,
        footer,
        trayId: "tray-step",
        fullScreen: false,
      });

      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <Probe content="body" header="header" footer="footer" />,
      );
    });

    act(() => {
      renderer!.update(<Probe />);
      state!.actions.showLatestSnapshot();
      state!.actions.syncRenderedNodes("tray-step");
    });

    expect(state!.state.renderedHeader).toBe("header");
    expect(state!.state.renderedContent).toBe("body");
    expect(state!.state.renderedFooter).toBe("footer");
  });

  it("publishes the real payload during prepared-host activation", () => {
    const renders: React.ReactNode[] = [];
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    const Probe = ({
      prepared,
      visible,
      content,
      trayId,
    }: {
      prepared: boolean;
      visible: boolean;
      content?: React.ReactNode;
      trayId: string;
    }) => {
      const state = useTrayRenderState({
        prepared,
        visible,
        content,
        trayId,
      });
      renders.push(state.state.renderedContent);
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <Probe
          prepared
          visible={false}
          content={null}
          trayId="__morpheus_prepared_root_host__-step"
        />,
      );
    });

    act(() => {
      renderer!.update(
        <Probe
          prepared={false}
          visible
          content="first tray content"
          trayId="tray-step-0"
        />,
      );
    });

    expect(renders[1]).toBe("first tray content");
  });

});
