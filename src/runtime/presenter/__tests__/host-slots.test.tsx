import React, { Profiler } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { DEFAULT_TRAY_STEP_OPTIONS } from "../../tray-step-options";
import { NestedTrayStack, RootTraySlots } from "../host-slots";
import type { PresentedTray, PresentedTrayProps } from "../types";

const createPresentedTray = (
  rootTrayId: string,
  stackIndex: number,
): PresentedTray => ({
  rootTrayId,
  trayId: `${rootTrayId}-step`,
  stepOptions: DEFAULT_TRAY_STEP_OPTIONS,
  header: null,
  content: null,
  footer: null,
  fullScreenBoundaryExit: false,
  isFirstRender: true,
  fullScreen: false,
  fullScreenBackgroundScale: 1,
  fullScreenSafeAreaTop: false,
  fullScreenDraggable: true,
  dismissible: true,
  transitionContract: null,
  stackIndex,
  visible: true,
  interactive: true,
});

const createCommonProps = (renderHost: PresentedTrayRenderer) => ({
  requestCloseActiveTray: () => undefined,
  dismissKeyboardForTray: () => undefined,
  transitionContract: null,
  renderHost,
});

type PresentedTrayRenderer = React.ComponentType<PresentedTrayProps>;

const HostNode = ({
  onCloseComplete,
  lifecycle,
  prepared,
  trayId,
}: {
  onCloseComplete: () => void;
  lifecycle?: string[];
  prepared?: boolean;
  trayId?: string;
}) => {
  React.useEffect(() => {
    if (!lifecycle || trayId === undefined) {
      return;
    }

    lifecycle.push(`mount:${trayId}:${prepared === true ? "prepared" : "active"}`);

    return () => {
      lifecycle.push(`unmount:${trayId}`);
    };
    // This test tracks component lifetime, not prop updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

describe("presenter host startup", () => {
  let renderer: ReactTestRenderer | null = null;

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
      renderer = null;
    }
  });

  it("publishes a new nested host in the initial presenter commit", () => {
    const commits: string[] = [];
    const hostRenders: string[] = [];
    const renderHost: PresentedTrayRenderer = ({ payload }) => {
      hostRenders.push(payload.rootTrayId);
      return null;
    };

    act(() => {
      renderer = create(
        <Profiler
          id="nested-host-startup"
          onRender={(_, phase) => commits.push(phase)}
        >
          <NestedTrayStack
            hosts={[createPresentedTray("nested", 1)]}
            {...createCommonProps(renderHost)}
          />
        </Profiler>,
      );
    });

    expect(commits).toEqual(["mount"]);
    expect(hostRenders).toEqual(["nested"]);
  });

  it("keeps a removed nested host mounted until close completion", () => {
    const hostStates: [string, boolean][] = [];
    const renderHost: PresentedTrayRenderer = ({
      payload,
      onCloseComplete,
    }) => {
      hostStates.push([payload.rootTrayId, payload.visible]);

      return <HostNode onCloseComplete={onCloseComplete} />;
    };
    const commonProps = createCommonProps(renderHost);

    act(() => {
      renderer = create(
        <NestedTrayStack
          hosts={[createPresentedTray("nested", 1)]}
          {...commonProps}
        />,
      );
    });

    act(() => {
      renderer?.update(
        <NestedTrayStack hosts={[]} {...commonProps} />,
      );
    });

    expect(hostStates).toContainEqual(["nested", false]);

    const closingHost = renderer?.root.findByType(HostNode);
    act(() => {
      closingHost?.props.onCloseComplete();
    });

    expect(renderer?.root.findAllByType(HostNode)).toHaveLength(0);
  });

  it("renders the first root host before slot state publication", () => {
    const events: string[] = [];
    const renderHost: PresentedTrayRenderer = ({ payload }) => {
      events.push(`host:${payload.rootTrayId}`);
      return null;
    };
    const commonProps = createCommonProps(renderHost);

    act(() => {
      renderer = create(
        <RootTraySlots
          activeHost={null}
          {...commonProps}
        />,
      );
    });

    act(() => {
      renderer?.update(
        <RootTraySlots
          activeHost={createPresentedTray("root", 0)}
          {...commonProps}
        />,
      );
    });

    expect(events).toContain("host:root");
  });

  it("publishes same-root step payloads in the presenter render", () => {
    const renderedTrayIds: string[] = [];
    const phases: string[] = [];
    const renderHostMemo = React.memo(
      ({ payload }: PresentedTrayProps) => {
        renderedTrayIds.push(payload.trayId);
        return null;
      },
      (previous, next) => previous.payload === next.payload,
    );
    renderHostMemo.displayName = "SameRootHostProbe";
    const renderHost = renderHostMemo as React.ComponentType<PresentedTrayProps>;
    const commonProps = createCommonProps(renderHost);

    act(() => {
      renderer = create(
        <Profiler
          id="same-root-step"
          onRender={(_, phase) => phases.push(phase)}
        >
          <RootTraySlots
            activeHost={null}
            {...commonProps}
          />
        </Profiler>,
      );
    });

    act(() => {
      renderer?.update(
        <Profiler
          id="same-root-step"
          onRender={(_, phase) => phases.push(phase)}
        >
          <RootTraySlots
            activeHost={createPresentedTray("root", 0)}
            {...commonProps}
          />
        </Profiler>,
      );
    });

    renderedTrayIds.length = 0;
    phases.length = 0;

    act(() => {
      renderer?.update(
        <Profiler
          id="same-root-step"
          onRender={(_, phase) => phases.push(phase)}
        >
          <RootTraySlots
            activeHost={{
              ...createPresentedTray("root", 0),
              trayId: "root-next-step",
            }}
            {...commonProps}
          />
        </Profiler>,
      );
    });

    expect(renderedTrayIds).toEqual(["root-next-step"]);
    expect(phases).toEqual(["update", "nested-update"]);
  });

  it("publishes durable slot state for same-root mode changes", () => {
    const phases: string[] = [];
    const renderHost = React.memo(
      ({ payload }: PresentedTrayProps) => (
        <HostNode
          onCloseComplete={() => {}}
          trayId={payload.trayId}
        />
      ),
    );
    renderHost.displayName = "SameRootModeHostProbe";
    const commonProps = createCommonProps(renderHost);
    const sheetHost = createPresentedTray("root", 0);

    act(() => {
      renderer = create(
        <Profiler
          id="same-root-mode"
          onRender={(_, phase) => phases.push(phase)}
        >
          <RootTraySlots activeHost={sheetHost} {...commonProps} />
        </Profiler>,
      );
    });

    phases.length = 0;

    act(() => {
      renderer?.update(
        <Profiler
          id="same-root-mode"
          onRender={(_, phase) => phases.push(phase)}
        >
          <RootTraySlots
            activeHost={{
              ...sheetHost,
              fullScreen: true,
            }}
            {...commonProps}
          />
        </Profiler>,
      );
    });

    expect(phases).toEqual(["update", "nested-update"]);
  });

  it("closes the latest same-root step after the durable slot catches up", () => {
    const hostStates: [string, boolean][] = [];
    const renderHost: PresentedTrayRenderer = ({ payload }) => {
      hostStates.push([payload.trayId, payload.visible]);
      return null;
    };
    const commonProps = createCommonProps(renderHost);

    act(() => {
      renderer = create(
        <RootTraySlots
          activeHost={createPresentedTray("root", 0)}
          {...commonProps}
        />,
      );
    });

    act(() => {
      renderer?.update(
        <RootTraySlots
          activeHost={{
            ...createPresentedTray("root", 0),
            trayId: "root-next-step",
          }}
          {...commonProps}
        />,
      );
    });

    act(() => {
      renderer?.update(
        <RootTraySlots activeHost={null} {...commonProps} />,
      );
    });

    expect(hostStates).toContainEqual(["root-next-step", false]);
  });

  it("reuses the prepared root host for the first presentation", () => {
    const lifecycle: string[] = [];
    const renderHost: PresentedTrayRenderer = ({
      payload,
      prepared,
      onCloseComplete,
    }) => (
      <HostNode
        onCloseComplete={onCloseComplete}
        lifecycle={lifecycle}
        prepared={prepared === true}
        trayId={payload.rootTrayId}
      />
    );
    const commonProps = createCommonProps(renderHost);

    act(() => {
      renderer = create(
        <RootTraySlots activeHost={null} {...commonProps} />,
      );
    });

    act(() => {
      renderer?.update(
        <RootTraySlots
          activeHost={createPresentedTray("root", 0)}
          {...commonProps}
        />,
      );
    });

    act(() => {
      renderer?.update(
        <RootTraySlots activeHost={null} {...commonProps} />,
      );
    });

    const closingHost = renderer?.root.findByType(HostNode);
    act(() => {
      closingHost?.props.onCloseComplete();
    });

    act(() => {
      renderer?.update(
        <RootTraySlots
          activeHost={createPresentedTray("root-again", 0)}
          {...commonProps}
        />,
      );
    });

    expect(lifecycle.filter((event) => event.startsWith("mount:")).length).toBe(
      1,
    );
    expect(
      lifecycle.some((event) =>
        event.startsWith("mount:__morpheus_prepared_root_host__"),
      ),
    ).toBe(true);
    expect(
      lifecycle.some((event) =>
        event.startsWith("unmount:__morpheus_prepared_root_host__"),
      ),
    ).toBe(false);
  });
});
