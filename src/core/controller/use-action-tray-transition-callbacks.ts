import { useCallback } from "react";
import type { SharedValue } from "react-native-reanimated";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import {
  markTrayStepLayoutConfigured,
  markTrayStepLayoutFinished,
  markTrayStepLayoutStarted,
} from "../../telemetry/tray-step-timing";
import type {
  TrayPresentationMode,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../../runtime/types";
import { log } from "../logger";
import { describeTrayTransition } from "../diagnostics/action-tray-transition-diagnostics";
import type { ActionTraySheetFrame } from "../types/action-tray";

type Ref<T> = { current: T };

type Params = {
  rootTrayId?: string;
  transitionLifecycle?: TrayTransitionLifecycle;
  activeTrayIdRef: Ref<string | undefined>;
  activeTransitionGenerationRef: Ref<number | undefined>;
  activeTransitionRef: Ref<TrayTransitionContract | null | undefined>;
  renderedTransitionGenerationRef: Ref<number | undefined>;
  renderedTransitionRef: Ref<TrayTransitionContract | null | undefined>;
  renderedFullScreenRef: Ref<boolean>;
  lastHandledLayoutCompletionGenerationRef: Ref<number>;
  returningToSheetRef: Ref<boolean>;
  latestLayoutFrameRef: Ref<{
    contentHeight: number;
    footerHeight: number;
  }>;
  preparedSheetFrameRef: Ref<ActionTraySheetFrame | undefined>;
  contentMeasurementLeaseRef: Ref<boolean>;
  measuredFooterHeightRef: Ref<number>;
  footerHeight: SharedValue<number>;
  commitStableContentHeight: (
    height: number,
    trayId?: string,
    mode?: TrayPresentationMode,
  ) => boolean;
  clearPreparedSheetFrame: () => void;
};

// layout callbacks own lifecycle marks and release the temporary sheet frame lease
export const useActionTrayTransitionCallbacks = ({
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
  contentMeasurementLeaseRef,
  measuredFooterHeightRef,
  footerHeight,
  commitStableContentHeight,
  clearPreparedSheetFrame,
}: Params) => {
  const handleLayoutTransitionConfigured = useCallback(
    (configuredAt: number, callbackGeneration?: number) => {
      // js timestamps keep lifecycle telemetry on one observable clock
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
            }
          : null,
        leaseActive: contentMeasurementLeaseRef.current,
      });
      markTrayStepLayoutConfigured(
        rootTrayId,
        activeTrayIdRef.current,
        observedAt,
      );
    }, [
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
            }
          : null,
        leaseActive: contentMeasurementLeaseRef.current,
      });

      if (activeTransition) {
        transitionLifecycle?.mark(
          callbackGeneration ?? activeTransition.generation,
          "layoutStarted",
          { trayId: activeTrayIdRef.current },
          observedAt,
        );
      }

      if (isActionTrayInstrumentationEnabled()) {
        markTrayStepLayoutStarted(
          rootTrayId,
          activeTrayIdRef.current,
          observedAt,
        );
      }
    }, [
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

      if (
        hasCallbackGeneration &&
        callbackGeneration !== activeGeneration
      ) {
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
        callbackGeneration <=
          lastHandledLayoutCompletionGenerationRef.current
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
            }
          : null,
        leaseActive: contentMeasurementLeaseRef.current,
      });

      if (activeTransition) {
        transitionLifecycle?.mark(
          callbackGeneration ?? activeTransition.generation,
          "completed",
          { trayId: activeTrayIdRef.current },
          observedAt,
        );
      }

      markTrayStepLayoutFinished(
        rootTrayId,
        activeTrayIdRef.current,
        observedAt,
      );

      const completedGeneration =
        callbackGeneration ?? activeTransition?.generation;
      if (
        preparedSheetFrameRef.current &&
        completedGeneration === preparedSheetFrameRef.current.generation
      ) {
        const completedSheetFrame = preparedSheetFrameRef.current;
        const completedToSheet =
          activeTransition?.fullScreenChanged === true &&
          activeTransition.to?.mode === "sheet";

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
          const stableContentHeight =
            completedSheetFrame.totalHeight - footerEndpointHeight;

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
        }

        contentMeasurementLeaseRef.current = false;
        preparedSheetFrameRef.current = undefined;
        clearPreparedSheetFrame();
        log("SHEET FRAME RELEASED", {
          completedGeneration,
          trayId: activeTrayIdRef.current,
          stableContentHeight: completedToSheet
            ? completedSheetFrame.totalHeight -
              (measuredFooterHeightRef.current > 0
                ? measuredFooterHeightRef.current
                : footerHeight.value)
            : undefined,
        });
      }

      if (returningToSheetRef.current) {
        // the returned sheet owns intrinsic height after the boundary settles
        returningToSheetRef.current = false;
      }
    }, [
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
      renderedFullScreenRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      returningToSheetRef,
      rootTrayId,
      transitionLifecycle,
    ],
  );

  return {
    handleLayoutTransitionConfigured,
    handleLayoutTransitionStart,
    handleLayoutTransitionComplete,
  };
};
