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
  it("matches a dynamic destination through its stable root tray", () => {
    jest
      .spyOn(globalThis.performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(105)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(124)
      .mockReturnValueOnce(130)
      .mockReturnValueOnce(132)
      .mockReturnValueOnce(145);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    markTrayStepRequested("root-tray");
    markTrayStepPresenterResolved("root-tray");
    markTrayStepSlotCommitted("root-tray");
    markTrayStepSnapshotPublished("root-tray", "root-tray-fullscreen");
    markTrayStepReactRenderStarted(
      "root-tray",
      "root-tray-fullscreen",
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
    markTrayStepContentReleased("root-tray-fullscreen");
    markTrayStepLayoutFinished(
      "root-tray",
      "root-tray-fullscreen",
      405,
    );

    expect(timingGlobal.__TRAY_STEP_TIMINGS__).toEqual([
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
        keyboardIntentToFocusMs: undefined,
        keyboardFocusToWillShowMs: undefined,
        keyboardWillShowToLayoutStartMs: undefined,
      },
    ]);
    expect(consoleSpy).toHaveBeenCalledWith("[TrayStepPerf]", {
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
      keyboardIntentToFocusMs: undefined,
      keyboardFocusToWillShowMs: undefined,
      keyboardWillShowToLayoutStartMs: undefined,
    });
  });
});
