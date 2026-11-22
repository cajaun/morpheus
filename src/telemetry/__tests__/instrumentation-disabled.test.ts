import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  markTrayOpenFinished,
  markTrayOpenRequested,
  markTrayTriggerPressed,
} from "../tray-open-timing";
import {
  markTrayStepRequested,
  markTrayStepSnapshotPublished,
} from "../tray-step-timing";

// the disabled path stays tested while repository diagnostics are on
jest.mock("../config", () => ({
  TRAY_INSTRUMENTATION_ENABLED: false,
  isTrayInstrumentationEnabled: () => false,
}));

// disabled diagnostics leave globals and console untouched
const timingGlobal = globalThis as typeof globalThis & {
  __TRAY_OPEN_TIMINGS__?: unknown[];
  __TRAY_STEP_TIMINGS__?: unknown[];
};

afterEach(() => {
  jest.restoreAllMocks();
  delete timingGlobal.__TRAY_OPEN_TIMINGS__;
  delete timingGlobal.__TRAY_STEP_TIMINGS__;
});

describe("disabled tray instrumentation", () => {
  it("does not record or log timing data", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    markTrayTriggerPressed("root-tray");
    markTrayOpenRequested("root-tray");
    markTrayOpenFinished("root-tray", "root-tray-step");
    markTrayStepRequested("root-tray");
    markTrayStepSnapshotPublished("root-tray", "root-tray-step");

    expect(timingGlobal.__TRAY_OPEN_TIMINGS__).toBeUndefined();
    expect(timingGlobal.__TRAY_STEP_TIMINGS__).toBeUndefined();
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
