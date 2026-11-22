import { useCallback } from "react";
import { markTrayStepLayoutFinished } from "../../telemetry/tray-step-timing";
import { markTrayBoundaryLayoutFinished } from "../../telemetry/tray-boundary-timing";
import { log } from "../logger";
import { reportTrayTransitionPhase } from "../../runtime/transition-lifecycle-bridge";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import {
  createTrayEndpointKey,
  isSheetFrameForTransition,
} from "./tray-sheet-frame";

import type { TransitionCallbackParams } from "./transition-callback-params";

// complete a layout transition once, commit its endpoint height and release the sheet frame lease
export const useLayoutTransitionComplete = (
  params: TransitionCallbackParams,
) => {
  const {
    rootTrayId,
    transitionLifecycle,
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
    committedSheetFrameRef,
    contentMeasurementLeaseRef,
    measuredFooterHeightRef,
    footerHeight,
    commitStableContentHeight,
    clearPreparedSheetFrame,
  } = params;

  const handleLayoutTransitionComplete = useCallback(
    (finishedAt: number, callbackGeneration?: number) => {
      const observedAt = performance.now();
      const activeTransition =
        activeTransitionRef.current ?? renderedTransitionRef.current;
      const activeGeneration =
        activeTransitionGenerationRef.current ??
        renderedTransitionGenerationRef.current;
      const hasCallbackGeneration =
        callbackGeneration !== undefined && callbackGeneration > 0;

      if (hasCallbackGeneration && callbackGeneration !== activeGeneration) {
        log("LAYOUT TRANSITION COMPLETE IGNORED — stale generation", {
          finishedAt: observedAt,
          reportedFinishedAt: finishedAt,
          callbackGeneration,
          activeGeneration,
          trayId: activeTrayIdRef.current,
        });
        return;
      }

      if (
        hasCallbackGeneration &&
        callbackGeneration <= lastHandledLayoutCompletionGenerationRef.current
      ) {
        log("LAYOUT TRANSITION COMPLETE IGNORED — duplicate generation", {
          finishedAt: observedAt,
          reportedFinishedAt: finishedAt,
          callbackGeneration,
          lastHandledGeneration:
            lastHandledLayoutCompletionGenerationRef.current,
          trayId: activeTrayIdRef.current,
        });
        return;
      }

      if (hasCallbackGeneration) {
        lastHandledLayoutCompletionGenerationRef.current = callbackGeneration;
      }

      log("LAYOUT TRANSITION COMPLETE", {
        finishedAt: observedAt,
        reportedFinishedAt: finishedAt,
        trayId: activeTrayIdRef.current,
        transitionGeneration:
          callbackGeneration ?? activeTransition?.generation,
        fullScreenBoundary: activeTransition?.fullScreenChanged,
        renderedFullScreen: renderedFullScreenRef.current,
        contentHeight: latestLayoutFrameRef.current.contentHeight,
        footerHeight: latestLayoutFrameRef.current.footerHeight,
        returningToSheet: returningToSheetRef.current,
        activeTransition: describeTrayTransition(activeTransitionRef.current),
        renderedTransition: describeTrayTransition(
          renderedTransitionRef.current,
        ),
        preparedSheetFrame: preparedSheetFrameRef.current
          ? {
              endpointKey: preparedSheetFrameRef.current.endpointKey,
              generation: preparedSheetFrameRef.current.generation,
              totalHeight: preparedSheetFrameRef.current.totalHeight,
              contentHeight: preparedSheetFrameRef.current.contentHeight,
            }
          : null,
        leaseActive: contentMeasurementLeaseRef.current,
      });

      if (activeTransition) {
        reportTrayTransitionPhase({
          lifecycle: transitionLifecycle,
          generation: callbackGeneration ?? activeTransition.generation,
          phase: "completed",
          source: "Tray.Layout",
          details: { trayId: activeTrayIdRef.current },
          at: observedAt,
        });
      }

      markTrayStepLayoutFinished(
        rootTrayId,
        activeTrayIdRef.current,
        observedAt,
        callbackGeneration ?? activeTransition?.generation,
      );
      markTrayBoundaryLayoutFinished(
        rootTrayId,
        activeTransition ?? renderedTransitionRef.current,
      );

      const completedGeneration =
        callbackGeneration ?? activeTransition?.generation;
      if (
        preparedSheetFrameRef.current &&
        completedGeneration === preparedSheetFrameRef.current.generation
      ) {
        const completedSheetFrame = preparedSheetFrameRef.current;
        const targetEndpoint = activeTransition?.to;
        const completedToSheet =
          targetEndpoint?.mode === "sheet" &&
          isSheetFrameForTransition(
            completedSheetFrame,
            completedGeneration,
            undefined,
            createTrayEndpointKey(targetEndpoint),
          );
        let stableContentHeight: number | undefined;

        log("SHEET FRAME COMPLETION DECISION", {
          completedGeneration,
          frameGeneration: completedSheetFrame.generation,
          completedToSheet,
          activeTransition: describeTrayTransition(activeTransition),
          renderedTransition: describeTrayTransition(
            renderedTransitionRef.current,
          ),
          frameEndpointKey: completedSheetFrame.endpointKey,
          frameTotalHeight: completedSheetFrame.totalHeight,
          measuredFooterHeight: measuredFooterHeightRef.current,
          footerHeight: footerHeight.value,
          leaseActive: contentMeasurementLeaseRef.current,
        });

        if (completedToSheet) {
          const footerEndpointHeight =
            measuredFooterHeightRef.current > 0
              ? measuredFooterHeightRef.current
              : footerHeight.value;
          stableContentHeight = completedSheetFrame.contentHeight;

          if (
            commitStableContentHeight(
              stableContentHeight,
              activeTrayIdRef.current,
              "sheet",
            )
          ) {
            latestLayoutFrameRef.current.contentHeight = stableContentHeight;
            latestLayoutFrameRef.current.footerHeight = footerEndpointHeight;
          }

          committedSheetFrameRef.current = completedSheetFrame;
        } else {
          committedSheetFrameRef.current = undefined;
        }

        contentMeasurementLeaseRef.current = false;
        preparedSheetFrameRef.current = undefined;
        clearPreparedSheetFrame();
        log("SHEET FRAME RELEASED", {
          completedGeneration,
          trayId: activeTrayIdRef.current,
          stableContentHeight: completedToSheet
            ? stableContentHeight
            : undefined,
        });
      }

      if (returningToSheetRef.current) {
        // the returned sheet owns its intrinsic height after the boundary settles
        returningToSheetRef.current = false;
      }
    },
    [
      activeTrayIdRef,
      activeTransitionGenerationRef,
      activeTransitionRef,
      clearPreparedSheetFrame,
      commitStableContentHeight,
      contentMeasurementLeaseRef,
      footerHeight,
      lastHandledLayoutCompletionGenerationRef,
      latestLayoutFrameRef,
      measuredFooterHeightRef,
      preparedSheetFrameRef,
      committedSheetFrameRef,
      renderedFullScreenRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      returningToSheetRef,
      rootTrayId,
      transitionLifecycle,
    ],
  );

  return handleLayoutTransitionComplete;
};
