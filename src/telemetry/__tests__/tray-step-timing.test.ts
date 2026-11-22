import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  markTrayStepContentReleased,
  markTrayStepLayoutConfigured,
  markTrayStepLayoutFinished,
  markTrayStepLayoutStarted,
  markTrayStepPresenterResolved,
  markTrayStepReactRenderStarted,
  markTrayStepRenderedCommit,
  markTrayStepRequested,
  markTrayStepShellLayout,
  markTrayStepSlotCommitted,
  markTrayStepSnapshotPublished,
  type TrayStepTimingSummary,
} from "../tray-step-timing";

// full step timing summaries through the public mark functions
jest.mock("../config", () => ({
  TRAY_INSTRUMENTATION_ENABLED: true,
  isTrayInstrumentationEnabled: () => true,
}));

const timingGlobal = globalThis as typeof globalThis & {
  __TRAY_STEP_TIMINGS__?: TrayStepTimingSummary[];
};

afterEach(() => {
  jest.restoreAllMocks();
  delete timingGlobal.__TRAY_STEP_TIMINGS__;
});

describe("tray step timing", () => {
  it("separates staging and committed snapshot renders by transition generation", () => {
    jest
      .spyOn(globalThis.performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(105)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(115)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(124)
      .mockReturnValueOnce(130)
      .mockReturnValueOnce(132)
      .mockReturnValueOnce(145);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    markTrayStepRequested("root-tray", 7);
    markTrayStepPresenterResolved("root-tray", 7, "root-tray-fullscreen");
    markTrayStepSlotCommitted("root-tray", 7, "root-tray-fullscreen");
    markTrayStepReactRenderStarted(
      "root-tray",
      "root-tray-fullscreen",
      2,
      {
        phase: "update",
        baseDurationMs: 3,
        startTime: 111,
        commitTime: 113,
        transitionGeneration: 7,
      },
    );
    markTrayStepSnapshotPublished("root-tray", "root-tray-fullscreen", 7);
    markTrayStepReactRenderStarted(
      "root-tray",
      "root-tray-fullscreen",
      4,
      {
        phase: "nested-update",
        baseDurationMs: 5,
        startTime: 121,
        commitTime: 123,
        transitionGeneration: 7,
      },
    );
    markTrayStepRenderedCommit("root-tray", "root-tray-fullscreen", 7);
    markTrayStepShellLayout("root-tray", "root-tray-fullscreen", 7);
    markTrayStepLayoutConfigured(
      "root-tray",
      "root-tray-fullscreen",
      134,
      7,
    );
    markTrayStepLayoutStarted(
      "root-tray",
      "root-tray-fullscreen",
      135,
      7,
    );
    markTrayStepContentReleased("root-tray-fullscreen");
    markTrayStepLayoutFinished(
      "root-tray",
      "root-tray-fullscreen",
      405,
      7,
    );

    expect(timingGlobal.__TRAY_STEP_TIMINGS__).toEqual([
      {
        rootTrayId: "root-tray",
        trayId: "root-tray-fullscreen",
        transitionGeneration: 7,
        requestToPresenterResolvedMs: 5,
        presenterResolvedToSlotStateCommitMs: 5,
        requestToSnapshotPublicationMs: 20,
        snapshotPublicationToRenderedCommitMs: 10,
        renderedCommitToShellLayoutMs: 2,
        renderedCommitToLayoutConfiguredMs: 4,
        layoutConfiguredToLayoutStartMs: 1,
        renderedCommitToLayoutStartMs: 5,
        snapshotToLayoutStartMs: 15,
        requestToLayoutStartMs: 35,
        layoutStartToContentReleaseMs: 10,
        layoutStartToFinishMs: 270,
        incomingReactRender: {
          phase: "update",
          actualDurationMs: 2,
          baseDurationMs: 3,
          profilerStartTimeMs: 111,
          profilerCommitTimeMs: 113,
          profilerSpanMs: 2,
        },
        snapshotReactRender: {
          phase: "nested-update",
          actualDurationMs: 4,
          baseDurationMs: 5,
          profilerStartTimeMs: 121,
          profilerCommitTimeMs: 123,
          profilerSpanMs: 2,
        },
        incomingReactRenderCount: 1,
        snapshotReactRenderCount: 1,
        blockingReactRenderMs: 6,
        reactCommitsDuringLayout: 0,
        keyboardIntentToFocusMs: undefined,
        keyboardFocusToWillShowMs: undefined,
        keyboardWillShowToLayoutStartMs: undefined,
      },
    ]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[TrayStepPerf]",
      JSON.stringify(timingGlobal.__TRAY_STEP_TIMINGS__?.[0]),
    );
  });

  it("keeps a late mark from the previous step off the next step's trace", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const root = "late-mark-root";
    const target = "late-mark-root-feedback";

    // step 2 never gets its shell layout before the next request
    markTrayStepRequested(root);
    markTrayStepPresenterResolved(root, 2, "late-mark-root-areas");
    markTrayStepRequested(root);
    // the stale generation 2 shell layout arrives after the next request
    markTrayStepShellLayout(root, "late-mark-root-areas", 2);

    markTrayStepPresenterResolved(root, 3, target);
    markTrayStepSlotCommitted(root, 3, target);
    markTrayStepSnapshotPublished(root, target, 3);
    markTrayStepRenderedCommit(root, target, 3);
    markTrayStepShellLayout(root, target, 3);
    markTrayStepLayoutConfigured(root, target, 10, 3);
    markTrayStepLayoutStarted(root, target, 11, 3);
    markTrayStepContentReleased(target);
    markTrayStepLayoutFinished(root, target, 300, 3);

    const lines = consoleSpy.mock.calls.map((call) => call[0]);

    expect(lines).toContain("[TrayStepPerf:incomplete]");
    expect(timingGlobal.__TRAY_STEP_TIMINGS__).toEqual([
      expect.objectContaining({ trayId: target, transitionGeneration: 3 }),
    ]);
  });
});
