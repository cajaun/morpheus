// opening waits only for geometry that will exist, a footer removed mid-open is no longer waited for
import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { useTrayMeasurements } from "../use-tray-measurements";

const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

describe("open readiness", () => {
  it("stops waiting for a fixed footer that is removed before it lays out", () => {
    const contentHeight = shared(0);
    const footerHeight = shared(0);
    let measurements = {} as ReturnType<typeof useTrayMeasurements>;
    let renderer: TestRenderer.ReactTestRenderer;

    const Probe = ({ footer }: { footer?: React.ReactNode }) => {
      measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "root-one",
        renderedFooter: footer,
      });

      return null;
    };

    act(() => {
      renderer = TestRenderer.create(<Probe footer="footer" />);
    });
    act(() => {
      measurements.actions.beginOpenMeasurement(true);
    });
    act(() => {
      measurements.actions.commitContentHeight(320, "root-one");
    });

    // content is known, the footer has not laid out yet
    expect(measurements.state.isReadyToOpen).toBe(false);

    act(() => {
      renderer.update(<Probe footer={undefined} />);
    });

    expect(measurements.state.isReadyToOpen).toBe(true);
  });

  it("still waits for a footer that remains", () => {
    const contentHeight = shared(0);
    const footerHeight = shared(0);
    let measurements = {} as ReturnType<typeof useTrayMeasurements>;

    const Probe = () => {
      measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "root-one",
        renderedFooter: "footer",
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });
    act(() => {
      measurements.actions.beginOpenMeasurement(true);
      measurements.actions.commitContentHeight(320, "root-one");
    });

    expect(measurements.state.isReadyToOpen).toBe(false);
  });

  it("opens a tray growing out of its trigger as soon as its content is measured", () => {
    const contentHeight = shared(0);
    const footerHeight = shared(0);
    let measurements = {} as ReturnType<typeof useTrayMeasurements>;

    const Probe = () => {
      measurements = useTrayMeasurements({
        contentHeight,
        footerHeight,
        renderedTrayId: "root-one",
        renderedFooter: "footer",
      });

      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });
    act(() => {
      // the footer's open geometry is fixed, so its layout is never waited for
      measurements.actions.beginOpenMeasurement(true, true);
    });

    expect(measurements.state.isReadyToOpen).toBe(false);

    act(() => {
      measurements.actions.commitContentHeight(320, "root-one");
    });

    expect(measurements.state.isReadyToOpen).toBe(true);
  });
});
