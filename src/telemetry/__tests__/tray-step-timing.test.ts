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

// probe full step timing summaries through the public mark functions
jest.mock("../config", () => ({
  ACTION_TRAY_INSTRUMENTATION_ENABLED: true,
  isActionTrayInstrumentationEnabled: () => true,
}));

const timingGlobal = globalThis as typeof globalThis & {
  __ACTION_TRAY_STEP_TIMINGS__?: TrayStepTimingSummary[];
};

afterEach(() => {
  jest.restoreAllMocks();
  delete timingGlobal.__ACTION_TRAY_STEP_TIMINGS__;
});

describe("tray step timing", () => {
  it("matches a dynamic destination through its stable root tray", () => {
    jest
      .spyOn(globalThis.performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(105)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(130)
      .mockReturnValueOnce(132);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    markTrayStepRequested("root-tray");
    markTrayStepPresenterResolved("root-tray");
    markTrayStepSlotCommitted("root-tray");
    markTrayStepSnapshotPublished("root-tray", "root-tray-fullscreen");
    markTrayStepReactRenderStarted(
      "root-tray",
      "root-tray-fullscreen",
      124,
      4,
    );
    markTrayStepRenderedCommit("root-tray", "root-tray-fullscreen");
    markTrayStepShellLayout("root-tray", "root-tray-fullscreen");
    markTrayStepLayoutConfigured(
      "root-tray",
      "root-tray-fullscreen",
      134,
    );
    markTrayStepLayoutStarted(
      "root-tray",
      "root-tray-fullscreen",
      135,
    );
    markTrayStepContentReleased("root-tray-fullscreen", 145);
    markTrayStepLayoutFinished(
      "root-tray",
      "root-tray-fullscreen",
      405,
    );

    expect(timingGlobal.__ACTION_TRAY_STEP_TIMINGS__).toEqual([
      {
        rootTrayId: "root-tray",
        trayId: "root-tray-fullscreen",
        requestToPresenterResolvedMs: 5,
        presenterResolvedToSlotCommitMs: 5,
        slotCommitToSnapshotMs: 10,
        requestToSnapshotMs: 20,
        snapshotToReactRenderStartMs: 4,
        reactRenderStartToRenderedCommitMs: 6,
        reactActualDurationMs: 4,
        snapshotToRenderedCommitMs: 10,
        renderedCommitToShellLayoutMs: 2,
        renderedCommitToLayoutConfiguredMs: 4,
        layoutConfiguredToLayoutStartMs: 1,
        renderedCommitToLayoutStartMs: 5,
        snapshotToLayoutStartMs: 15,
        requestToLayoutStartMs: 35,
        layoutStartToContentReleaseMs: 10,
        layoutStartToFinishMs: 270,
      },
    ]);
    expect(consoleSpy).toHaveBeenCalledWith("[ActionTrayStepPerf]", {
      rootTrayId: "root-tray",
      trayId: "root-tray-fullscreen",
      requestToPresenterResolvedMs: 5,
      presenterResolvedToSlotCommitMs: 5,
      slotCommitToSnapshotMs: 10,
      requestToSnapshotMs: 20,
      snapshotToReactRenderStartMs: 4,
      reactRenderStartToRenderedCommitMs: 6,
      reactActualDurationMs: 4,
      snapshotToRenderedCommitMs: 10,
      renderedCommitToShellLayoutMs: 2,
      renderedCommitToLayoutConfiguredMs: 4,
      layoutConfiguredToLayoutStartMs: 1,
      renderedCommitToLayoutStartMs: 5,
      snapshotToLayoutStartMs: 15,
      requestToLayoutStartMs: 35,
      layoutStartToContentReleaseMs: 10,
      layoutStartToFinishMs: 270,
    });
  });
});
