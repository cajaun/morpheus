// measured frames stay owned by the active transition
import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionContract } from "../../../runtime/types";
import { useTrayGeometryOwnership } from "../use-tray-geometry-ownership";

// the shared completion value ownership probes use
const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

const returnToSheetTransition: TrayTransitionContract = {
  generation: 9,
  reason: "returnToShell",
  direction: "forward",
  boundary: "fullScreenToSheet",
  from: {
    trayId: "root",
    stepIndex: 2,
    stepKey: "content-three",
    mode: "fullScreen",
  },
  to: {
    trayId: "root",
    stepIndex: 3,
    stepKey: "content-four",
    mode: "sheet",
  },
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: true,
  sharedRegions: [],
};

describe("useTrayGeometryOwnership", () => {
  it("does not reopen a sheet frame lease for a completed generation", () => {
    const transitionCompletedGeneration = shared(9);
    let geometry = {} as ReturnType<typeof useTrayGeometryOwnership>;

    const Probe = () => {
      geometry = useTrayGeometryOwnership({
        visible: true,
        rootTrayId: "root",
        trayId: "root-content-four",
        fullScreen: false,
        presentationFullScreen: false,
        renderedTrayId: "root-content-four",
        renderedTransitionContract: returnToSheetTransition,
        transitionContract: returnToSheetTransition,
        transitionCompletedGeneration,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      geometry?.handlers.handleSheetFramePrepared(
        501,
        "target",
        411,
        "root-content-four",
      );
    });

    expect(geometry.state.preparedSheetFrame).toBeUndefined();
    expect(geometry.refs.contentMeasurementLeaseRef.current).toBe(false);
  });

  it("accepts a sheet frame for a newer active generation", () => {
    const transitionCompletedGeneration = shared(9);
    const transition: TrayTransitionContract = {
      ...returnToSheetTransition,
      generation: 10,
      boundary: "sheetToFullScreen",
      from: {
        ...returnToSheetTransition.to!,
        mode: "sheet",
      },
      to: {
        ...returnToSheetTransition.from!,
        mode: "fullScreen",
      },
    };
    let geometry = {} as ReturnType<typeof useTrayGeometryOwnership>;

    const Probe = () => {
      geometry = useTrayGeometryOwnership({
        visible: true,
        rootTrayId: "root",
        trayId: "root-content-three",
        fullScreen: true,
        presentationFullScreen: true,
        renderedTrayId: "root-content-three",
        renderedTransitionContract: transition,
        transitionContract: transition,
        transitionCompletedGeneration,
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    act(() => {
      geometry?.handlers.handleSheetFramePrepared(
        501,
        "source",
        411,
        "root-content-four",
      );
    });

    expect(geometry.state.preparedSheetFrame).toMatchObject({
      generation: 10,
      totalHeight: 501,
      contentHeight: 411,
    });
    expect(geometry.refs.contentMeasurementLeaseRef.current).toBe(true);
  });
});
