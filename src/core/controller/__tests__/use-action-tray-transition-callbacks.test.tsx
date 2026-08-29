import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import TestRenderer, { act } from "react-test-renderer";
import type { TrayTransitionContract } from "../../../runtime/types";
import type { ActionTraySheetFrame } from "../../types/action-tray";
import { useActionTrayTransitionCallbacks } from "../use-action-tray-transition-callbacks";

const shared = <T,>(value: T) => ({ value }) as SharedValue<T>;

const sheetToSheetTransition: TrayTransitionContract = {
  generation: 5,
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
};

const renderCallbacks = (transition: TrayTransitionContract) => {
  const activeTrayIdRef = { current: "root-content-one" };
  const activeTransitionGenerationRef = { current: transition.generation };
  const activeTransitionRef = { current: transition };
  const renderedTransitionGenerationRef = { current: transition.generation };
  const renderedTransitionRef = { current: transition };
  const renderedFullScreenRef = { current: false };
  const lastHandledLayoutCompletionGenerationRef = { current: 0 };
  const returningToSheetRef = { current: false };
  const latestLayoutFrameRef = {
    current: { contentHeight: 411, footerHeight: 90 },
  };
  const preparedSheetFrameRef: {
    current: ActionTraySheetFrame | undefined;
  } = {
    current: {
      endpointKey: "root::content-one::step::sheet",
      generation: transition.generation,
      totalHeight: 345,
      contentHeight: 255,
    },
  };
  const contentMeasurementLeaseRef = { current: true };
  const measuredFooterHeightRef = { current: 90 };
  const footerHeight = shared(90);
  const commitStableContentHeight = jest.fn(() => true);
  const clearPreparedSheetFrame = jest.fn();
  let callbacks: ReturnType<typeof useActionTrayTransitionCallbacks> | null =
    null;

  const Probe = () => {
    callbacks = useActionTrayTransitionCallbacks({
      rootTrayId: "root",
      activeTrayIdRef,
      activeTransitionGenerationRef,
      activeTransitionRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      renderedFullScreenRef,
      lastHandledLayoutCompletionGenerationRef,
      returningToSheetRef,
      latestLayoutFrameRef,
      preparedSheetFrameRef,
      contentMeasurementLeaseRef,
      measuredFooterHeightRef,
      footerHeight,
      commitStableContentHeight,
      clearPreparedSheetFrame,
    });

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return {
    callbacks: callbacks!,
    clearPreparedSheetFrame,
    commitStableContentHeight,
    contentMeasurementLeaseRef,
    latestLayoutFrameRef,
    preparedSheetFrameRef,
  };
};

describe("useActionTrayTransitionCallbacks", () => {
  it("promotes a prepared sheet target before releasing it on sheet-to-sheet completion", () => {
    const harness = renderCallbacks(sheetToSheetTransition);

    act(() => {
      harness.callbacks.handleLayoutTransitionComplete(123, 5);
    });

    expect(harness.commitStableContentHeight).toHaveBeenCalledWith(
      255,
      "root-content-one",
      "sheet",
    );
    expect(harness.latestLayoutFrameRef.current.contentHeight).toBe(255);
    expect(harness.contentMeasurementLeaseRef.current).toBe(false);
    expect(harness.preparedSheetFrameRef.current).toBeUndefined();
    expect(harness.clearPreparedSheetFrame).toHaveBeenCalledTimes(1);
  });

  it("does not promote a prepared source frame when the target is fullscreen", () => {
    const transition: TrayTransitionContract = {
      ...sheetToSheetTransition,
      boundary: "sheetToFullScreen",
      to: {
        ...sheetToSheetTransition.to!,
        mode: "fullScreen",
      },
    };
    const harness = renderCallbacks(transition);

    act(() => {
      harness.callbacks.handleLayoutTransitionComplete(123, 5);
    });

    expect(harness.commitStableContentHeight).not.toHaveBeenCalled();
    expect(harness.contentMeasurementLeaseRef.current).toBe(false);
    expect(harness.preparedSheetFrameRef.current).toBeUndefined();
  });
});
