import React, { useCallback, useRef } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED } from "../../telemetry/config";
import { measureTrayNode } from "../measure-node";
import { TrayStepFooterMetricsContext } from "../step-footer";
import { TrayContentCommitTargetContext } from "../tray-content-commit";
import { type TraySheetSurfaceProps } from "./props";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";

// content height reports of the sheet, including the step footer reserve and the unchanged-height path
export const useSheetContentMeasurement = ({
  handleContentLayout,
  renderedContent,
  renderedFullScreen,
  renderSnapshotStore,
}: Pick<
  TraySheetSurfaceProps,
  | "handleContentLayout"
  | "renderedContent"
  | "renderedFullScreen"
  | "renderSnapshotStore"
>) => {
  const contentMeasureRef = useRef<React.ComponentRef<typeof View>>(null);
  const contentOriginRef = useRef({ x: 0, y: 0 });
  // last content height native layout reported, a step at this height gets no onLayout and no layout transition
  const laidOutContentHeightRef = useRef<number | null>(null);
  const handleContentLayoutRef = useRef(handleContentLayout);
  handleContentLayoutRef.current = handleContentLayout;
  // the sheet reports the step footer's height with the content height, fullscreen steps reserve it with a spacer
  const stepFooterMetrics = React.useContext(TrayStepFooterMetricsContext);
  const stepFooterMetricsRef = useRef(stepFooterMetrics);
  stepFooterMetricsRef.current = stepFooterMetrics;
  const renderedFullScreenRef = useRef(renderedFullScreen);
  renderedFullScreenRef.current = renderedFullScreen;
  // the footer reserve in the last reported content height
  const laidOutFooterReserveRef = useRef(0);
  const resolveStepFooterReserve = useCallback(
    () =>
      stepFooterMetricsRef.current && !renderedFullScreenRef.current
        ? stepFooterMetricsRef.current.heightRef.current
        : 0,
    [],
  );
  const reportContentHeight = useCallback(
    (x: number, y: number, width: number, nativeHeight: number) => {
      const reserve = resolveStepFooterReserve();

      laidOutFooterReserveRef.current = reserve;
      handleContentLayoutRef.current({
        nativeEvent: {
          layout: { x, y, width, height: nativeHeight + reserve },
        },
      } as LayoutChangeEvent);
    },
    [resolveStepFooterReserve],
  );
  const handleMeasuredContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;

      contentOriginRef.current = { x, y };
      laidOutContentHeightRef.current = height;
      reportContentHeight(x, y, width, height);
    },
    [reportContentHeight],
  );
  // measure committed content in the layout effect so the target height applies before the frame, the later onLayout deduplicates by signature
  const commitTarget = React.useContext(TrayContentCommitTargetContext);
  const commitTargetRef = useRef(commitTarget);
  commitTargetRef.current = commitTarget;
  const measureCommittedContent = useCallback(
    (generation?: number) => {
      const target = commitTargetRef.current;
      const committedGeneration =
        generation ?? target?.shellGenerationRef.current ?? 0;

      if (target) {
        // record which transition's content is mounted, raw node content uses the shell's generation
        target.committedGeneration.value = committedGeneration;
      }

      const node = contentMeasureRef.current;

      // an unchanged height means native layout changes nothing, so no onLayout and no layout transition run
      const commitWithoutResize = target?.commitWithoutResizeRef?.current;
      const previousHeight = laidOutContentHeightRef.current;

      if (
        commitWithoutResize &&
        committedGeneration > 0 &&
        previousHeight !== null
      ) {
        measureTrayNode(node, (_x, _y, width, height) => {
          if (
            !Number.isFinite(height) ||
            Math.abs(height - previousHeight) >= 0.5
          ) {
            return;
          }

          // report the height the missing onLayout would have, the close travel and height cache depend on it
          const { x, y } = contentOriginRef.current;
          // an unchanged content height with a different footer still resizes the sheet
          const footerChanged =
            Math.abs(
              resolveStepFooterReserve() - laidOutFooterReserveRef.current,
            ) >= 0.5;

          reportContentHeight(x, y, width, height);

          if (!footerChanged) {
            commitWithoutResize(committedGeneration);
          }
        });
      }

      if (!TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED) {
        return;
      }

      measureTrayNode(node, (_x, _y, width, height) => {
        if (
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          height <= 1
        ) {
          return;
        }

        const { x, y } = contentOriginRef.current;

        reportContentHeight(x, y, width, height);
      });
    },
    [reportContentHeight, resolveStepFooterReserve],
  );

  // re-report the content height when the step footer resizes without a step change
  useProfiledTrayLayoutEffect("core/visual-view/use-sheet-content-measurement#1", () => {
    if (!stepFooterMetrics) {
      return;
    }

    stepFooterMetrics.remeasureContentRef.current = () => {
      measureTrayNode(contentMeasureRef.current, (_x, _y, width, height) => {
        if (Number.isFinite(height) && height > 1) {
          const { x, y } = contentOriginRef.current;

          reportContentHeight(x, y, width, height);
        }
      });
    };

    return () => {
      stepFooterMetrics.remeasureContentRef.current = null;
    };
  }, [reportContentHeight, stepFooterMetrics]);

  const fallbackStepFooterHeight = useSharedValue(0);
  const stepFooterHeight =
    stepFooterMetrics?.height ?? fallbackStepFooterHeight;
  const stepFooterSpacerStyle = useAnimatedStyle(
    () => ({
      height: renderedFullScreen ? stepFooterHeight.value : 0,
    }),
    [renderedFullScreen, stepFooterHeight],
  );

  // raw-node mode swaps content through props
  useProfiledTrayLayoutEffect("core/visual-view/use-sheet-content-measurement#2", () => {
    if (!renderSnapshotStore && renderedContent != null) {
      measureCommittedContent();
    }
  }, [measureCommittedContent, renderSnapshotStore, renderedContent]);

  return {
    contentMeasureRef,
    handleMeasuredContentLayout,
    measureCommittedContent,
    stepFooterMetrics,
    stepFooterSpacerStyle,
  };
};
