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
}: {
  onCloseComplete: () => void;
}) => {
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

    expect(events[0]).toBe("host:root");
  });
});
