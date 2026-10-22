import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createTrayTransitionContract } from "../../runtime/transition-contract";
import {
  markTrayBoundaryLayoutConfigured,
  markTrayBoundaryLayoutFinished,
  markTrayBoundaryLayoutStarted,
  markTrayBoundaryPresenterResolved,
  markTrayBoundaryReactRender,
  markTrayBoundaryRenderedCommit,
  markTrayBoundaryRequested,
  markTrayBoundaryShellLayout,
  markTrayBoundarySlotCommitted,
  markTrayBoundarySnapshotCommitted,
  type TrayBoundaryTimingSummary,
} from "../tray-boundary-timing";

jest.mock("../config", () => ({
  TRAY_INSTRUMENTATION_ENABLED: true,
  isTrayInstrumentationEnabled: () => true,
}));

const timingGlobal = globalThis as typeof globalThis & {
  __TRAY_BOUNDARY_TIMINGS__?: TrayBoundaryTimingSummary[];
};

const transition = createTrayTransitionContract({
  generation: 11,
  reason: "nextStep",
  from: {
    trayId: "root-tray",
    stepIndex: 0,
    stepKey: "sheet",
    mode: "sheet",
  },
  to: {
    trayId: "root-tray",
    stepIndex: 1,
    stepKey: "full-screen",
    mode: "fullScreen",
  },
});

afterEach(() => {
  jest.restoreAllMocks();
  delete timingGlobal.__TRAY_BOUNDARY_TIMINGS__;
});

describe("tray boundary timing", () => {
  it("records the fullscreen request through layout completion", () => {
    jest
      .spyOn(globalThis.performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(105)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(115)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(125)
      .mockReturnValueOnce(130)
      .mockReturnValueOnce(132)
      .mockReturnValueOnce(145);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    markTrayBoundaryRequested("root-tray", transition);
    markTrayBoundaryPresenterResolved(
      "root-tray",
      transition,
      "root-tray-full-screen",
    );
    markTrayBoundarySlotCommitted(
      "root-tray",
      transition,
      "root-tray-full-screen",
    );
    markTrayBoundarySnapshotCommitted(
      "root-tray",
      transition,
      "root-tray-full-screen",
    );
    markTrayBoundaryRenderedCommit(
      "root-tray",
      transition,
      "root-tray-full-screen",
    );
    markTrayBoundaryShellLayout(
      "root-tray",
      transition,
      "root-tray-full-screen",
    );
    markTrayBoundaryReactRender(
      "root-tray",
      transition,
      "root-tray-full-screen",
      {
        phase: "update",
        actualDurationMs: 23.4,
        baseDurationMs: 22.8,
        profilerStartTimeMs: 1,
        profilerCommitTimeMs: 24.4,
        profilerSpanMs: 23.4,
      },
    );
    markTrayBoundaryLayoutConfigured("root-tray", transition);
    markTrayBoundaryLayoutStarted("root-tray", transition);
    markTrayBoundaryLayoutFinished("root-tray", transition);

    expect(timingGlobal.__TRAY_BOUNDARY_TIMINGS__).toEqual([
      {
        rootTrayId: "root-tray",
        trayId: "root-tray-full-screen",
        generation: 11,
        fromMode: "sheet",
        toMode: "fullScreen",
        requestToPresenterResolvedMs: 5,
        requestToSlotCommittedMs: 10,
        requestToSnapshotPublicationMs: 15,
        snapshotPublicationToRenderedCommitMs: 5,
        requestToRenderedCommitMs: 20,
        renderedCommitToShellLayoutMs: 5,
        renderedCommitToLayoutConfiguredMs: 10,
        renderedCommitToLayoutStartMs: 12,
        requestToLayoutStartMs: 32,
        layoutStartToFinishMs: 13,
        reactRender: {
          phase: "update",
          actualDurationMs: 23.4,
          baseDurationMs: 22.8,
          profilerStartTimeMs: 1,
          profilerCommitTimeMs: 24.4,
          profilerSpanMs: 23.4,
        },
      },
    ]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[TrayBoundaryPerf]",
      JSON.stringify(timingGlobal.__TRAY_BOUNDARY_TIMINGS__?.[0]),
    );
  });
});
