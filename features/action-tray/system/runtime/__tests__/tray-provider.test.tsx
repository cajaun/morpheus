import React, { useMemo, useState } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import {
  Tray,
  TrayProvider,
  useTrayFlow,
  useTrayHost,
  type TrayStepDefinition,
} from "@/features/action-tray";

jest.mock("../../core/action-tray", () => {
  const ReactNative = require("react-native");

  return {
    ActionTray: ({ visible, content, footer }: any) => (
      <ReactNative.View testID="action-tray-host">
        {visible ? content ?? footer ?? null : null}
      </ReactNative.View>
    ),
  };
});

jest.mock("../../core/input/use-action-tray-keyboard", () => {
  const createSharedValue = (initialValue: number) => ({
    value: initialValue,
    get() {
      return this.value;
    },
    set(nextValue: number) {
      this.value = nextValue;
    },
    addListener: jest.fn(),
    removeListener: jest.fn(),
    modify: jest.fn((modifier: (current: number) => number) => {
      const nextValue = modifier(initialValue);
      initialValue = nextValue;
      return nextValue;
    }),
  });

  return {
    useActionTrayKeyboard: () => ({
      keyboardHeight: createSharedValue(0),
      anticipateKeyboard: jest.fn(),
      dismissKeyboard: jest.fn(),
    }),
  };
});

let latestHost: ReturnType<typeof useTrayHost> | null = null;
let latestFlow: ReturnType<typeof useTrayFlow> | null = null;
let activeRenderer: TestRenderer.ReactTestRenderer | null = null;

const HostSpy = () => {
  latestHost = useTrayHost();
  return null;
};

const FlowSpy = () => {
  latestFlow = useTrayFlow();
  return null;
};

const getRenderedTrayHosts = () =>
  activeRenderer!.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      node.props.testID === "action-tray-host",
  );

const step = (key: string, options?: TrayStepDefinition["options"]): TrayStepDefinition => ({
  key,
  content: <Text>{key}</Text>,
  options,
});

describe("TrayProvider runtime", () => {
  beforeEach(() => {
    latestHost = null;
    latestFlow = null;
    activeRenderer = null;
  });

  afterEach(() => {
    if (activeRenderer) {
      act(() => {
        activeRenderer?.unmount();
      });
      activeRenderer = null;
    }
  });

  it("registers and unregisters trays cleanly", () => {
    act(() => {
      activeRenderer = TestRenderer.create(
        <TrayProvider>
          <HostSpy />
          <Tray.Root steps={[step("one")]}>
            <FlowSpy />
          </Tray.Root>
        </TrayProvider>,
      );
    });

    expect(latestHost).not.toBeNull();
    expect(Object.keys(latestHost!.registry)).toHaveLength(1);

    act(() => {
      latestHost!.openTray(latestFlow!.trayId);
    });

    expect(latestHost!.activeTrayId).toBe(latestFlow!.trayId);

    act(() => {
      activeRenderer!.update(
        <TrayProvider>
          <HostSpy />
        </TrayProvider>,
      );
    });

    expect(Object.keys(latestHost!.registry)).toHaveLength(0);
    expect(latestHost!.activeTrayId).toBeNull();
  });

  it("supports open, next, and back navigation", () => {
    act(() => {
      activeRenderer = TestRenderer.create(
        <TrayProvider>
          <HostSpy />
          <Tray.Root steps={[step("one"), step("two"), step("three")]}>
            <FlowSpy />
          </Tray.Root>
        </TrayProvider>,
      );
    });

    act(() => {
      latestHost!.openTray(latestFlow!.trayId);
    });

    expect(latestHost!.activeTrayId).toBe(latestFlow!.trayId);
    expect(latestHost!.activeIndex).toBe(0);

    act(() => {
      latestHost!.nextStep();
    });

    expect(latestHost!.activeIndex).toBe(1);

    act(() => {
      latestHost!.previousStep();
    });

    expect(latestHost!.activeIndex).toBe(0);
  });

  it("returns fullscreen flows to the shell before dismissing", () => {
    act(() => {
      activeRenderer = TestRenderer.create(
        <TrayProvider>
          <HostSpy />
          <Tray.Root
            steps={[
              step("shell"),
              step("fullscreen", {
                fullScreen: true,
                fullScreenCloseBehavior: "returnToShell",
              }),
            ]}
          >
            <FlowSpy />
          </Tray.Root>
        </TrayProvider>,
      );
    });

    act(() => {
      latestHost!.openTray(latestFlow!.trayId);
      latestHost!.nextStep();
    });

    expect(latestHost!.activeIndex).toBe(1);

    act(() => {
      latestHost!.requestCloseActiveTray();
    });

    expect(latestHost!.activeTrayId).toBe(latestFlow!.trayId);
    expect(latestHost!.activeIndex).toBe(0);

    act(() => {
      latestHost!.requestCloseActiveTray();
    });

    expect(latestHost!.activeTrayId).toBeNull();
  });

  it("updates tray definitions when step data changes without changing keys", () => {
    let setExpanded: React.Dispatch<React.SetStateAction<boolean>> = () => {};

    const DynamicTray = () => {
      const [expanded, updateExpanded] = useState(false);
      setExpanded = updateExpanded;

      const steps = useMemo<TrayStepDefinition[]>(
        () => (expanded ? [step("stable-key"), step("second-step")] : [step("stable-key")]),
        [expanded],
      );

      return (
        <Tray.Root steps={steps}>
          <FlowSpy />
        </Tray.Root>
      );
    };

    act(() => {
      activeRenderer = TestRenderer.create(
        <TrayProvider>
          <HostSpy />
          <DynamicTray />
        </TrayProvider>,
      );
    });

    expect(latestFlow!.total).toBe(1);

    act(() => {
      setExpanded(true);
    });

    expect(latestFlow!.total).toBe(2);

    act(() => {
      latestHost!.openTray(latestFlow!.trayId);
      latestHost!.nextStep();
    });

    expect(latestHost!.activeIndex).toBe(1);
    expect(latestHost!.registry[latestFlow!.trayId]?.steps).toHaveLength(2);
  });

  it("keeps the mounted tray host pool bounded during tray switches", () => {
    act(() => {
      activeRenderer = TestRenderer.create(
        <TrayProvider>
          <HostSpy />
          <Tray.Root id="alpha" steps={[step("one")]}>
            <></>
          </Tray.Root>
          <Tray.Root id="beta" steps={[step("one")]}>
            <></>
          </Tray.Root>
          <Tray.Root id="gamma" steps={[step("one")]}>
            <></>
          </Tray.Root>
        </TrayProvider>,
      );
    });

    expect(getRenderedTrayHosts()).toHaveLength(2);

    act(() => {
      latestHost!.openTray("alpha");
    });

    expect(getRenderedTrayHosts().length).toBeLessThanOrEqual(2);

    act(() => {
      latestHost!.openTray("beta");
    });

    expect(getRenderedTrayHosts()).toHaveLength(2);
  });
});
