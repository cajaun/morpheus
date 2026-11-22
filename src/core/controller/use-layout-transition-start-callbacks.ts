import { useCallback } from "react";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import {
  markTrayStepLayoutConfigured,
  markTrayStepLayoutStarted,
} from "../../telemetry/tray-step-timing";
import {
  markTrayBoundaryLayoutConfigured,
  markTrayBoundaryLayoutStarted,
} from "../../telemetry/tray-boundary-timing";
import { log } from "../logger";
import { reportTrayTransitionPhase } from "../../runtime/transition-lifecycle-bridge";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";

import type { TransitionCallbackParams } from "./transition-callback-params";

// lifecycle and timing marks when a layout transition is configured and starts
export const useLayoutTransitionStartCallbacks = (
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
    latestLayoutFrameRef,
    preparedSheetFrameRef,
    contentMeasurementLeaseRef,
  } = params;

  const handleLayoutTransitionConfigured = useCallback(
    (configuredAt: number, callbackGeneration?: number) => {
      // JS timestamps keep lifecycle telemetry on one clock
      const observedAt = performance.now();
      const activeGeneration =
        activeTransitionGenerationRef.current ??
        renderedTransitionGenerationRef.current;

      if (
        callbackGeneration !== undefined &&
        callbackGeneration > 0 &&
        callbackGeneration !== activeGeneration
      ) {
        log("LAYOUT TRANSITION CONFIGURED IGNORED — stale generation", {
          configuredAt: observedAt,
          reportedConfiguredAt: configuredAt,
          callbackGeneration,
          activeGeneration,
          trayId: activeTrayIdRef.current,
        });
        return;
      }

      log("LAYOUT TRANSITION CONFIGURED", {
        configuredAt: observedAt,
        reportedConfiguredAt: configuredAt,
        trayId: activeTrayIdRef.current,
        transitionGeneration:
          callbackGeneration ??
          activeTransitionRef.current?.generation ??
          renderedTransitionRef.current?.generation,
        fullScreenBoundary:
          activeTransitionRef.current?.fullScreenChanged ??
          renderedTransitionRef.current?.fullScreenChanged,
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
      markTrayStepLayoutConfigured(
        rootTrayId,
        activeTrayIdRef.current,
        observedAt,
        callbackGeneration ??
          activeTransitionRef.current?.generation ??
          renderedTransitionRef.current?.generation,
      );
      markTrayBoundaryLayoutConfigured(
        rootTrayId,
        activeTransitionRef.current ?? renderedTransitionRef.current,
      );
    },
    [
      activeTrayIdRef,
      activeTransitionGenerationRef,
      activeTransitionRef,
      contentMeasurementLeaseRef,
      preparedSheetFrameRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      rootTrayId,
    ],
  );

  const handleLayoutTransitionStart = useCallback(
    (startedAt: number, callbackGeneration?: number) => {
      const observedAt = performance.now();
      const activeTransition =
        activeTransitionRef.current ?? renderedTransitionRef.current;
      const activeGeneration =
        activeTransitionGenerationRef.current ??
        renderedTransitionGenerationRef.current;

      if (
        callbackGeneration !== undefined &&
        callbackGeneration > 0 &&
        callbackGeneration !== activeGeneration
      ) {
        log("LAYOUT TRANSITION START IGNORED — stale generation", {
          startedAt: observedAt,
          reportedStartedAt: startedAt,
          callbackGeneration,
          activeGeneration,
          trayId: activeTrayIdRef.current,
        });
        return;
      }

      log("LAYOUT TRANSITION START", {
        startedAt: observedAt,
        reportedStartedAt: startedAt,
        trayId: activeTrayIdRef.current,
        transitionGeneration:
          callbackGeneration ?? activeTransition?.generation,
        fullScreenBoundary: activeTransition?.fullScreenChanged,
        renderedFullScreen: renderedFullScreenRef.current,
        contentHeight: latestLayoutFrameRef.current.contentHeight,
        footerHeight: latestLayoutFrameRef.current.footerHeight,
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
          phase: "layoutStarted",
          source: "Tray.Layout",
          details: { trayId: activeTrayIdRef.current },
          at: observedAt,
        });
      }

      if (isTrayInstrumentationEnabled()) {
        markTrayStepLayoutStarted(
          rootTrayId,
          activeTrayIdRef.current,
          observedAt,
          callbackGeneration ?? activeTransition?.generation,
        );
      }
      markTrayBoundaryLayoutStarted(
        rootTrayId,
        activeTransition ?? renderedTransitionRef.current,
      );
    },
    [
      activeTrayIdRef,
      activeTransitionGenerationRef,
      activeTransitionRef,
      latestLayoutFrameRef,
      contentMeasurementLeaseRef,
      preparedSheetFrameRef,
      renderedFullScreenRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      rootTrayId,
      transitionLifecycle,
    ],
  );

  return { handleLayoutTransitionConfigured, handleLayoutTransitionStart };
};
