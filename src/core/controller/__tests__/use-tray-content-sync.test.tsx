import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { useTrayContentSync } from "../use-tray-content-sync";
import { useTrayMeasurements } from "../use-tray-measurements";

// probe content publication against fullscreen and sheet geometry races
const shared = (value: number) => ({ value }) as SharedValue<number>;

describe("useTrayContentSync", () => {
  it("does not cache a transient boundary viewport as body height", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    const onGeometryMeasured = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "sheet-step",
        acceptContentMeasurement: false,
        onContentHeightResolved,
        onGeometryMeasured,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 760 } },
      } as never);
    });

    expect(contentHeight.value).toBe(240);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
    expect(onGeometryMeasured).not.toHaveBeenCalled();
  });

  it("does not accept viewport measurements while a sheet frame is leased", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "sheet-step",
        contentMeasurementLeaseRef: { current: true },
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 760 } },
      } as never);
    });

    expect(contentHeight.value).toBe(240);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
  });

  it("keeps a prepared intrinsic floor when the return layout is short", () => {
    const contentHeight = shared(255);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    const preparedSheetFrameRef = {
      current: {
        endpointKey: "sheet-step::step::step::sheet",
        generation: 4,
        totalHeight: 319,
        contentHeight: 255,
      },
    };
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "sheet-step",
        renderedFullScreen: false,
        hasRenderedBody: true,
        contentMeasurementLeaseActive: true,
        allowIntrinsicSheetMeasurementDuringLease: true,
        preparedSheetFrameRef,
        measurementOwner: {
          rootTrayId: "root",
          trayId: "sheet-step",
          stepKey: "step",
          stepIndex: 0,
          mode: "sheet",
          generation: 4,
          presentationKey: "root::sheet-step::step::sheet::4",
        },
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 248 } },
      } as never);
    });

    expect(contentHeight.value).toBe(255);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
  });

  it("quarantines transient layouts during trigger origin geometry", () => {
    const contentHeight = shared(506);
    const footerHeight = shared(90);
    const originGeometryLeaseRef = { current: true };
    const onContentHeightResolved = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "nested-sheet",
        hasRenderedBody: true,
        originGeometryLeaseRef,
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 580 } },
      } as never);
    });

    expect(contentHeight.value).toBe(506);
    expect(onContentHeightResolved).not.toHaveBeenCalled();

    originGeometryLeaseRef.current = false;

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 506 } },
      } as never);
    });

    expect(contentHeight.value).toBe(506);
    expect(onContentHeightResolved).toHaveBeenCalledTimes(1);
  });

  it("keeps the last body frame when a rendered step reports zero height", () => {
    const contentHeight = shared(255);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "sheet-step",
        hasRenderedBody: true,
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 0 } },
      } as never);
    });

    expect(contentHeight.value).toBe(255);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
  });

  it("rejects a late composite layout after a sheet frame completes", () => {
    const contentHeight = shared(224);
    const footerHeight = shared(90);
    const committedSheetFrameRef = {
      current: {
        endpointKey: "root::content-one::step::sheet",
        generation: 7,
        totalHeight: 314,
        contentHeight: 224,
      },
    };
    const onContentHeightResolved = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "root-content-one",
        renderedFullScreen: false,
        hasRenderedBody: true,
        measurementOwner: {
          rootTrayId: "root",
          trayId: "root",
          stepKey: "content-one",
          stepIndex: 0,
          mode: "sheet",
          generation: 7,
          presentationKey: "root::root::content-one::step::sheet::7",
        },
        committedSheetFrameRef,
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 180 } },
      } as never);
    });

    expect(contentHeight.value).toBe(224);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
  });

  it("reconciles a larger intrinsic layout after a sheet frame completes", () => {
    const contentHeight = shared(224);
    const footerHeight = shared(90);
    const committedSheetFrameRef = {
      current: {
        endpointKey: "root::content-one::step::sheet",
        generation: 7,
        totalHeight: 314,
        contentHeight: 224,
      },
    };
    const onContentHeightResolved = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "root-content-one",
        renderedFullScreen: false,
        hasRenderedBody: true,
        measurementOwner: {
          rootTrayId: "root",
          trayId: "root",
          stepKey: "content-one",
          stepIndex: 0,
          mode: "sheet",
          generation: 7,
          presentationKey: "root::root::content-one::step::sheet::7",
        },
        committedSheetFrameRef,
        onContentHeightResolved,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 356 } },
      } as never);
    });

    expect(contentHeight.value).toBe(356);
    expect(onContentHeightResolved).toHaveBeenCalledWith(
      356,
      356,
      "root-content-one",
      "sheet",
    );
    expect(committedSheetFrameRef.current).toMatchObject({
      contentHeight: 356,
    });
  });

  it("ignores a late layout callback from an older measurement owner", () => {
    const contentHeight = shared(255);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    let firstHandleContentLayout: ((event: never) => void) | null = null;

    const Probe = ({ ownerKey }: { ownerKey: string }) => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "sheet-step",
        hasRenderedBody: true,
        measurementOwner: {
          presentationKey: ownerKey,
        } as never,
        onContentHeightResolved,
      });

      if (firstHandleContentLayout === null) {
        firstHandleContentLayout = measurements.handlers.handleContentLayout as (
          event: never,
        ) => void;
      }

      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<Probe ownerKey="generation-four" />);
    });

    act(() => {
      renderer!.update(<Probe ownerKey="generation-five" />);
    });

    act(() => {
      firstHandleContentLayout?.({
        nativeEvent: { layout: { height: 0 } },
      } as never);
    });

    expect(contentHeight.value).toBe(255);
    expect(onContentHeightResolved).not.toHaveBeenCalled();
  });

  it("does not replay fullscreen geometry when the rendered snapshot catches up", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(240);
    const measuredFooterHeight = shared(64);
    const resolveIncomingContentHeight = jest.fn(() => 780);
    const restoreContentHeight = jest.fn(
      (_trayId: string | undefined, measuredHeight: number) => {
        contentHeight.value = measuredHeight;
        return measuredHeight;
      },
    );
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const onSheetFramePrepared = jest.fn();
    const justOpenedRef = { current: false };

    const Probe = ({
      fullScreen,
      renderedFullScreen,
      renderedTrayId,
      trayId,
      visible,
    }: {
      fullScreen: boolean;
      renderedFullScreen: boolean;
      renderedTrayId: string;
      trayId: string;
      visible: boolean;
    }) => {
      useTrayContentSync({
        visible,
        interactive: true,
        trayId,
        fullScreen,
        content: null,
        header: null,
        footer: null,
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId,
            renderedContent: null,
            renderedHeader: null,
            renderedFooter: null,
            renderedFullScreen,
            renderedTransitionContract: null,
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight,
        restoreContentHeight,
        onSheetFramePrepared,
      });

      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Probe
          visible={false}
          trayId="tray-sheet"
          renderedTrayId="tray-sheet"
          fullScreen={false}
          renderedFullScreen={false}
        />,
      );
    });

    act(() => {
      renderer!.update(
        <Probe
          visible
          trayId="tray-fullscreen"
          renderedTrayId="tray-sheet"
          fullScreen
          renderedFullScreen={false}
        />,
      );
    });

    // incoming fullscreen must not resize the source sheet before its snapshot changes
    expect(contentHeight.value).toBe(240);
    expect(resolveIncomingContentHeight).toHaveBeenCalledTimes(1);
    expect(restoreContentHeight).not.toHaveBeenCalled();
    expect(showLatestSnapshot).toHaveBeenCalledTimes(1);
    expect(onSheetFramePrepared).toHaveBeenCalledWith(
      304,
      "source",
      240,
      "tray-sheet",
    );
    expect(morphProgress.value).toBe(0);

    act(() => {
      renderer!.update(
        <Probe
          visible
          trayId="tray-fullscreen"
          renderedTrayId="tray-fullscreen"
          fullScreen
          renderedFullScreen
        />,
      );
    });

    // catching up the rendered snapshot must not replay fullscreen height preparation
    expect(contentHeight.value).toBe(240);
    expect(resolveIncomingContentHeight).toHaveBeenCalledTimes(1);
    expect(restoreContentHeight).not.toHaveBeenCalled();
    expect(showLatestSnapshot).toHaveBeenCalledTimes(1);

    act(() => {
      renderer!.update(
        <Probe
          visible
          trayId="tray-sheet"
          renderedTrayId="tray-fullscreen"
          fullScreen={false}
          renderedFullScreen
        />,
      );
    });

    // returning to sheet leases the measured frame through the layout animation
    expect(onSheetFramePrepared).toHaveBeenCalledWith(
      304,
      "target",
      240,
      "tray-sheet",
    );
    expect(showLatestSnapshot).toHaveBeenCalledTimes(2);
  });

  it("does not prepare an uncached sheet target from fullscreen height", () => {
    const contentHeight = shared(866);
    const footerHeight = shared(90);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(866);
    const measuredFooterHeight = shared(90);
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const onSheetFramePrepared = jest.fn();
    const restoreContentHeight = jest.fn(
      (
        _trayId: string | undefined,
        measuredHeight: number,
        _mode: "sheet" | "fullScreen" | undefined,
        allowMeasuredFallback = true,
      ) => {
        if (!allowMeasuredFallback) {
          contentHeight.value = 0;
          return undefined;
        }

        contentHeight.value = measuredHeight;
        return measuredHeight;
      },
    );
    const justOpenedRef = { current: false };

    const Probe = () => {
      useTrayContentSync({
        visible: true,
        interactive: true,
        trayId: "tray-content-four",
        fullScreen: false,
        content: "content four",
        header: "header four",
        footer: "footer",
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId: "tray-content-three",
            renderedContent: "content three",
            renderedHeader: "header three",
            renderedFooter: "footer",
            renderedFullScreen: true,
            renderedTransitionContract: null,
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight: jest.fn(() => 866),
        restoreContentHeight,
        onSheetFramePrepared,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    expect(restoreContentHeight).toHaveBeenCalledWith(
      "tray-content-four",
      866,
      "sheet",
      false,
    );
    expect(onSheetFramePrepared).not.toHaveBeenCalled();
    expect(contentHeight.value).toBe(0);
  });

  it("does not reuse the previous sheet height for an uncached sheet step", () => {
    const contentHeight = shared(356);
    const footerHeight = shared(90);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(356);
    const measuredFooterHeight = shared(90);
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const restoreContentHeight = jest.fn(
      (
        _trayId: string | undefined,
        measuredHeight: number,
        _mode: "sheet" | "fullScreen" | undefined,
        allowMeasuredFallback = true,
      ) => {
        if (!allowMeasuredFallback) {
          contentHeight.value = 0;
          return undefined;
        }

        contentHeight.value = measuredHeight;
        return measuredHeight;
      },
    );
    const justOpenedRef = { current: false };

    const Probe = () => {
      useTrayContentSync({
        visible: true,
        interactive: true,
        trayId: "tray-content-four",
        fullScreen: false,
        content: "content four",
        header: "header four",
        footer: "footer",
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId: "tray-content-two",
            renderedContent: "content two",
            renderedHeader: "header two",
            renderedFooter: "footer",
            renderedFullScreen: true,
            renderedTransitionContract: null,
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight: jest.fn(() => 356),
        restoreContentHeight,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    expect(restoreContentHeight).toHaveBeenCalledWith(
      "tray-content-four",
      356,
      "sheet",
      false,
    );
    expect(contentHeight.value).toBe(0);
    expect(showLatestSnapshot).toHaveBeenCalledTimes(1);
  });

  it("publishes a sheet measurement for target frame preparation", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    const onSheetContentHeightMeasured = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "tray-content-four",
        renderedFullScreen: false,
        measurementOwner: {
          mode: "sheet",
          presentationKey: "tray-content-four-sheet",
        } as never,
        onContentHeightResolved,
        onSheetContentHeightMeasured,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 312 } },
      } as never);
    });

    expect(onSheetContentHeightMeasured).toHaveBeenCalledWith(
      312,
      "tray-content-four",
    );
  });

  it("uses the visible footer layout for the first-open measurement gate", () => {
    const contentHeight = shared(0);
    const footerHeight = shared(0);
    let beginOpenMeasurement: ((hasFooter: boolean) => void) | null = null;
    let handleContentLayout: ((event: never) => void) | null = null;
    let handleVisibleFooterLayout: ((event: never) => void) | null = null;
    let measurementState:
      | ReturnType<typeof useTrayMeasurements>["state"]
      | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "tray-content-four",
        renderedFooter: <React.Fragment />,
      });

      measurementState = measurements.state;
      beginOpenMeasurement = measurements.actions.beginOpenMeasurement;
      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      handleVisibleFooterLayout =
        measurements.handlers.handleVisibleFooterLayout as (
          event: never,
        ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      beginOpenMeasurement?.(true);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 240, width: 320, x: 0, y: 0 } },
      } as never);
      handleVisibleFooterLayout?.({
        nativeEvent: { layout: { height: 64, width: 320, x: 0, y: 0 } },
      } as never);
    });

    expect(measurementState).not.toBeNull();
    expect(measurementState!.isReadyToOpen).toBe(true);
    expect(footerHeight.value).toBe(64);
  });

  it("reuses a matching visible footer measurement when opening a prepared tray", () => {
    const contentHeight = shared(0);
    const footerHeight = shared(0);
    const footer = <React.Fragment />;
    let beginOpenMeasurement: ((hasFooter: boolean) => void) | null = null;
    let handleContentLayout: ((event: never) => void) | null = null;
    let handleVisibleFooterLayout: ((event: never) => void) | null = null;
    let measurementState:
      | ReturnType<typeof useTrayMeasurements>["state"]
      | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "prepared-step",
        renderedFooter: footer,
      });

      measurementState = measurements.state;
      beginOpenMeasurement = measurements.actions.beginOpenMeasurement;
      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      handleVisibleFooterLayout =
        measurements.handlers.handleVisibleFooterLayout as (
          event: never,
        ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      handleVisibleFooterLayout?.({
        nativeEvent: { layout: { height: 64, width: 320, x: 0, y: 0 } },
      } as never);
    });

    act(() => {
      beginOpenMeasurement?.(true);
    });

    act(() => {
      handleContentLayout?.({
        nativeEvent: { layout: { height: 240, width: 320, x: 0, y: 0 } },
      } as never);
    });

    expect(measurementState).not.toBeNull();
    expect(measurementState!.isReadyToOpen).toBe(true);
    expect(footerHeight.value).toBe(64);
  });

  it("does not republish an identical body layout frame", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    const onGeometryMeasured = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "tray-content-four",
        renderedFullScreen: false,
        measurementOwner: {
          mode: "sheet",
          presentationKey: "tray-content-four-sheet",
        } as never,
        onContentHeightResolved,
        onGeometryMeasured,
      });

      handleContentLayout = measurements.handlers.handleContentLayout as (
        event: never,
      ) => void;
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    const layoutEvent = {
      nativeEvent: {
        layout: { height: 312, width: 320, x: 0, y: 0 },
      },
    } as never;

    act(() => {
      handleContentLayout?.(layoutEvent);
    });

    act(() => {
      handleContentLayout?.(layoutEvent);
    });

    expect(onContentHeightResolved).toHaveBeenCalledTimes(1);
    expect(onGeometryMeasured).toHaveBeenCalledTimes(1);
  });

  it("keeps a stable footer spacer when the incoming sheet has not measured its footer yet", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(240);
    const measuredFooterHeight = shared(0);
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const onSheetFramePrepared = jest.fn();
    const restoreContentHeight = jest.fn(() => {
      contentHeight.value = 240;
      return 240;
    });
    const justOpenedRef = { current: false };

    const Probe = ({ renderedFullScreen }: { renderedFullScreen: boolean }) => {
      useTrayContentSync({
        visible: true,
        interactive: true,
        trayId: "tray-sheet",
        fullScreen: false,
        content: null,
        header: null,
        footer: null,
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId: "tray-fullscreen",
            renderedContent: null,
            renderedHeader: null,
            renderedFooter: null,
            renderedFullScreen,
            renderedTransitionContract: null,
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight: jest.fn(() => 780),
        restoreContentHeight,
        onSheetFramePrepared,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe renderedFullScreen />);
    });

    expect(footerHeight.value).toBe(64);
    expect(onSheetFramePrepared).toHaveBeenCalledWith(
      304,
      "target",
      240,
      "tray-sheet",
    );
  });

  it("reuses the last intrinsic sheet frame during a fullscreen return", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(240);
    const measuredFooterHeight = shared(64);
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const onSheetFramePrepared = jest.fn();
    const readCachedSheetContentHeight = jest.fn((_trayId?: string) => 255);
    const justOpenedRef = { current: false };

    const Probe = () => {
      useTrayContentSync({
        visible: true,
        interactive: true,
        trayId: "tray-step-two",
        fullScreen: false,
        transitionContract: {
          generation: 4,
          reason: "returnToShell",
          direction: "backward",
          boundary: "fullScreenToSheet",
          from: {
            trayId: "tray-step-one",
            stepIndex: 1,
            stepKey: "step-one",
            mode: "fullScreen",
          },
          to: {
            trayId: "tray-step-two",
            stepIndex: 2,
            stepKey: "step-two",
            mode: "sheet",
          },
          stepChanged: true,
          pageChanged: false,
          fullScreenChanged: true,
          sharedRegions: [],
        },
        content: "step two",
        header: "header two",
        footer: "footer",
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId: "tray-step-one",
            renderedContent: "step one",
            renderedHeader: "header one",
            renderedFooter: "footer",
            renderedFullScreen: true,
            renderedTransitionContract: {
              generation: 4,
              reason: "returnToShell",
              direction: "backward",
              boundary: "fullScreenToSheet",
              from: {
                trayId: "tray-step-one",
                stepIndex: 1,
                stepKey: "step-one",
                mode: "fullScreen",
              },
              to: {
                trayId: "tray-step-one",
                stepIndex: 1,
                stepKey: "step-one",
                mode: "sheet",
              },
              stepChanged: false,
              pageChanged: false,
              fullScreenChanged: true,
              sharedRegions: [],
            },
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight: jest.fn(() => 780),
        restoreContentHeight: jest.fn(() => undefined),
        readCachedSheetContentHeight,
        onSheetFramePrepared,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    expect(readCachedSheetContentHeight).toHaveBeenCalledWith(
      "tray-step-two",
    );
    expect(onSheetFramePrepared).toHaveBeenCalledWith(
      319,
      "target",
      255,
      "tray-step-two",
    );
    expect(contentHeight.value).toBe(255);
  });

  it("leases the cached target frame for an ordinary sheet-to-sheet change", () => {
    const contentHeight = shared(356);
    const footerHeight = shared(90);
    const morphProgress = shared(1);
    const measuredContentHeight = shared(356);
    const measuredFooterHeight = shared(90);
    const showLatestSnapshot = jest.fn();
    const syncRenderedNodes = jest.fn();
    const setLayoutAnimationEnabled = jest.fn();
    const onSheetFramePrepared = jest.fn();
    const justOpenedRef = { current: false };

    const Probe = () => {
      useTrayContentSync({
        visible: true,
        interactive: true,
        trayId: "tray-content-one",
        fullScreen: false,
        content: "content one",
        header: "header one",
        footer: "footer",
        justOpenedRef,
        measurements: {
          state: { layoutEnabled: true },
          actions: { setLayoutAnimationEnabled },
          shared: { measuredContentHeight, measuredFooterHeight },
        },
        renderState: {
          state: {
            renderedTrayId: "tray-content-two",
            renderedContent: "content two",
            renderedHeader: "header two",
            renderedFooter: "footer",
            renderedFullScreen: false,
            renderedTransitionContract: {
              generation: 7,
              reason: "previousStep",
              direction: "backward",
              boundary: "sheetToSheet",
              from: {
                trayId: "root",
                stepIndex: 1,
                stepKey: "content-two",
                mode: "sheet",
              },
              to: {
                trayId: "root",
                stepIndex: 0,
                stepKey: "content-one",
                mode: "sheet",
              },
              stepChanged: true,
              pageChanged: false,
              fullScreenChanged: false,
              sharedRegions: [],
            },
          },
          actions: { showLatestSnapshot, syncRenderedNodes },
        },
        contentHeight,
        footerHeight,
        morphProgress,
        resolveIncomingContentHeight: jest.fn((height: number) => height),
        restoreContentHeight: jest.fn(() => 224),
        readCachedSheetContentHeight: jest.fn(() => 224),
        onSheetFramePrepared,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    expect(contentHeight.value).toBe(224);
    expect(onSheetFramePrepared).toHaveBeenCalledWith(
      314,
      "target",
      224,
      "tray-content-one",
    );
  });
});
