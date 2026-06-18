import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { useActionTrayContentSync } from "../use-action-tray-content-sync";

const shared = (value: number) => ({ value }) as SharedValue<number>;

describe("useActionTrayContentSync", () => {
  it("does not replay fullscreen geometry when the rendered snapshot catches up", () => {
    const contentHeight = shared(240);
    const footerHeight = shared(64);
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

    expect(contentHeight.value).toBe(780);
    expect(resolveIncomingContentHeight).toHaveBeenCalledTimes(1);
    expect(restoreContentHeight).not.toHaveBeenCalled();

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

    expect(contentHeight.value).toBe(780);
    expect(resolveIncomingContentHeight).toHaveBeenCalledTimes(1);
    expect(restoreContentHeight).not.toHaveBeenCalled();

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

    expect(onSheetFramePrepared).toHaveBeenCalledWith(304);
  });
});
