import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { useActionTrayContentSync } from "../use-action-tray-content-sync";
import { useActionTrayMeasurements } from "../use-action-tray-measurements";

// probe content publication against fullscreen and sheet geometry races
const shared = (value: number) => ({ value }) as SharedValue<number>;

describe("useActionTrayContentSync", () => {
  it("does not cache a transient boundary viewport as body height", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
    const onContentHeightResolved = jest.fn();
    const onGeometryMeasured = jest.fn();
    let handleContentLayout: ((event: never) => void) | null = null;

    const Probe = () => {
      const measurements = useActionTrayMeasurements({
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
      useActionTrayContentSync({
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
    expect(onSheetFramePrepared).toHaveBeenCalledWith(304);
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
    expect(onSheetFramePrepared).toHaveBeenCalledWith(304);
    expect(showLatestSnapshot).toHaveBeenCalledTimes(2);
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
      useActionTrayContentSync({
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
    expect(onSheetFramePrepared).toHaveBeenCalledWith(304);
  });
});
