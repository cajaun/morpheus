// a sheet frame lease belongs to its transition, a newer transition or a finished close releases it
import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionContract } from "../../../runtime/types";
import { useTrayGeometryOwnership } from "../use-tray-geometry-ownership";

const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

const sheetStep = (
  generation: number,
  fromKey: string,
  toKey: string,
): TrayTransitionContract => ({
  generation,
  reason: "nextStep",
  direction: "forward",
  boundary: "sheetToSheet",
  from: { trayId: "root", stepIndex: 0, stepKey: fromKey, mode: "sheet" },
  to: { trayId: "root", stepIndex: 1, stepKey: toKey, mode: "sheet" },
  stepChanged: true,
  pageChanged: false,
  fullScreenChanged: false,
  sharedRegions: [],
});

const mountOwnership = (initial: TrayTransitionContract) => {
  const transitionCompletedGeneration = shared(0);
  let geometry = {} as ReturnType<typeof useTrayGeometryOwnership>;
  let renderer: TestRenderer.ReactTestRenderer;

  const Probe = ({ transition }: { transition: TrayTransitionContract }) => {
    geometry = useTrayGeometryOwnership({
      visible: true,
      rootTrayId: "root",
      trayId: `root-${transition.to?.stepKey}`,
      fullScreen: false,
      presentationFullScreen: false,
      renderedTrayId: `root-${transition.to?.stepKey}`,
      renderedTransitionContract: transition,
      transitionContract: transition,
      transitionCompletedGeneration,
    });

    return null;
  };

  act(() => {
    renderer = TestRenderer.create(<Probe transition={initial} />);
  });

  return {
    get geometry() {
      return geometry;
    },
    update: (transition: TrayTransitionContract) =>
      act(() => {
        renderer.update(<Probe transition={transition} />);
      }),
  };
};

describe("sheet frame lease ownership", () => {
  it("releases a lease its superseded transition never completed", () => {
    const probe = mountOwnership(sheetStep(5, "one", "two"));

    act(() => {
      probe.geometry.handlers.handleSheetFramePrepared(400, "target", 320);
    });
    expect(probe.geometry.refs.contentMeasurementLeaseRef.current).toBe(true);

    // a second step change starts before the first one's layout completes, with no cached height of its own
    probe.update(sheetStep(6, "two", "three"));

    expect(probe.geometry.refs.contentMeasurementLeaseRef.current).toBe(false);
    expect(probe.geometry.refs.preparedSheetFrameRef.current).toBeUndefined();
    expect(probe.geometry.state.preparedSheetFrame).toBeUndefined();
  });

  it("keeps the lease its own transition still owns", () => {
    const transition = sheetStep(5, "one", "two");
    const probe = mountOwnership(transition);

    act(() => {
      probe.geometry.handlers.handleSheetFramePrepared(400, "target", 320);
    });
    probe.update({ ...transition });

    expect(probe.geometry.refs.contentMeasurementLeaseRef.current).toBe(true);
    expect(probe.geometry.state.preparedSheetFrame?.generation).toBe(5);
  });

  it("releases every lease when the tray finishes closing", () => {
    const probe = mountOwnership(sheetStep(5, "one", "two"));

    act(() => {
      probe.geometry.handlers.handleSheetFramePrepared(400, "target", 320);
      probe.geometry.refs.committedSheetFrameRef.current =
        probe.geometry.refs.preparedSheetFrameRef.current;
      probe.geometry.refs.returningToSheetRef.current = true;
    });
    act(() => {
      probe.geometry.handlers.resetGeometry();
    });

    expect(probe.geometry.refs.contentMeasurementLeaseRef.current).toBe(false);
    expect(probe.geometry.refs.preparedSheetFrameRef.current).toBeUndefined();
    expect(probe.geometry.refs.committedSheetFrameRef.current).toBeUndefined();
    expect(probe.geometry.refs.returningToSheetRef.current).toBe(false);
    expect(probe.geometry.state.preparedSheetFrame).toBeUndefined();
  });
});
