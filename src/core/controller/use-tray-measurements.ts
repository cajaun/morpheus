import React, { useCallback, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import type { TrayPresentationMode } from "../../runtime/types";
import {
  type LayoutSignature,
  type TrayMeasurementParams,
} from "./measurement-types";
import { useContentLayoutHandler } from "./use-content-layout-handler";
import { useVisibleFooterLayoutHandler } from "./use-visible-footer-layout-handler";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

// body and footer measurements that resolve shell geometry
export const useTrayMeasurements = ({
  contentHeight,
  footerHeight,
  renderedTrayId,
  renderedFullScreen = false,
  renderedFooter,
  renderedSnapshotRef,
  hasRenderedBody = false,
  acceptContentMeasurement = true,
  contentMeasurementLeaseActive = false,
  contentMeasurementLeaseRef,
  allowIntrinsicSheetMeasurementDuringLease = false,
  originGeometryLeaseRef,
  preparedSheetFrameRef,
  committedSheetFrameRef,
  measurementOwnerRef,
  resolveContentHeight,
  onContentHeightResolved,
  onSheetContentHeightMeasured,
  measurementOwner,
  onGeometryMeasured,
}: TrayMeasurementParams) => {
  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const [isReadyToOpen, setIsReadyToOpen] = useState(false);
  // readiness arrivals live in refs and publish one React update once all open geometry is ready
  const footerMeasuredRef = useRef(false);
  const contentMeasuredRef = useRef(false);
  const pendingOpenRef = useRef(false);
  const syncOpenReadiness = useCallback(() => {
    const ready =
      pendingOpenRef.current &&
      contentMeasuredRef.current &&
      footerMeasuredRef.current;

    setIsReadyToOpen((current) => (current === ready ? current : ready));
  }, []);
  const markContentMeasured = useCallback(() => {
    if (contentMeasuredRef.current) {
      return;
    }

    contentMeasuredRef.current = true;
    syncOpenReadiness();
  }, [syncOpenReadiness]);

  // refs give synchronous reads across layout callbacks and spring setup
  const latestMeasuredContentHeightRef = useRef(0);
  const latestResolvedContentHeightRef = useRef(0);
  const latestMeasuredFooterHeightRef = useRef(0);
  const latestMeasuredTrayIdRef = useRef<string | undefined>(undefined);
  const measuredContentHeight = useSharedValue(0);
  const resolvedContentHeight = useSharedValue(0);
  const measuredFooterHeight = useSharedValue(0);
  const latestMeasuredFooterNodeRef = useRef<React.ReactNode | undefined>(
    undefined,
  );
  const latestMeasuredFooterTrayIdRef = useRef<string | undefined>(undefined);
  const latestMeasuredFooterFullScreenRef = useRef(false);
  const latestMeasurementOwnerRef = useRef(measurementOwner);
  const lastContentLayoutRef = useRef<LayoutSignature | null>(null);
  const lastVisibleFooterLayoutRef = useRef<LayoutSignature | null>(null);
  latestMeasurementOwnerRef.current =
    measurementOwnerRef?.current ?? measurementOwner;

  useProfiledTrayEffect("core/controller/use-tray-measurements#1", () => {
    if (renderedFooter) {
      return;
    }

    // a step that drops its footer clears footer state so the old spacer disappears
    latestMeasuredFooterHeightRef.current = 0;
    latestMeasuredFooterNodeRef.current = undefined;
    latestMeasuredFooterTrayIdRef.current = undefined;
    latestMeasuredFooterFullScreenRef.current = false;
    measuredFooterHeight.value = 0;
    footerHeight.value = 0;

    // an open waiting on this footer has nothing left to wait for, readiness is no footer or a measured one
    if (!footerMeasuredRef.current) {
      footerMeasuredRef.current = true;
      syncOpenReadiness();
    }
  }, [footerHeight, measuredFooterHeight, renderedFooter, syncOpenReadiness]);

  useProfiledTrayEffect("core/controller/use-tray-measurements#2", () => {
    // the payload reads shared values on the UI thread, so build it when the log is written
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("MEASUREMENT GATE", {
      renderedTrayId,
      renderedFullScreen,
      hasRenderedBody,
      renderedFooter: renderedFooter != null,
      acceptContentMeasurement,
      contentMeasurementLeaseActive,
      contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
      originGeometryLeaseActive: originGeometryLeaseRef?.current ?? false,
      measurementOwner: measurementOwner
        ? {
            presentationKey: measurementOwner.presentationKey,
            generation: measurementOwner.generation,
          }
        : null,
      latestMeasuredContentHeight: latestMeasuredContentHeightRef.current,
      latestResolvedContentHeight: latestResolvedContentHeightRef.current,
      latestMeasuredTrayId: latestMeasuredTrayIdRef.current,
      contentHeight: contentHeight.value,
      footerHeight: footerHeight.value,
    });
  }, [
    acceptContentMeasurement,
    contentHeight,
    contentMeasurementLeaseActive,
    contentMeasurementLeaseRef,
    footerHeight,
    hasRenderedBody,
    measurementOwner,
    originGeometryLeaseRef,
    renderedFooter,
    renderedFullScreen,
    renderedTrayId,
  ]);

  const beginOpenMeasurement = useCallback(
    // a footer whose open geometry is fixed, like a tray growing out of its trigger, is never waited for, its later layout still updates the measured height
    (hasFooter: boolean, footerGeometryFixed = false) => {
      // zeroed measurements keep the open from animating from a previous step's geometry
      latestMeasuredContentHeightRef.current = 0;
      latestResolvedContentHeightRef.current = 0;
      latestMeasuredTrayIdRef.current = undefined;
      lastContentLayoutRef.current = null;
      lastVisibleFooterLayoutRef.current = null;
      contentHeight.value = 0;
      measuredContentHeight.value = 0;
      resolvedContentHeight.value = 0;
      footerHeight.value = hasFooter ? latestMeasuredFooterHeightRef.current : 0;

      const canReuseVisibleFooterMeasurement =
        hasFooter &&
        latestMeasuredFooterHeightRef.current > 1 &&
        latestMeasuredFooterNodeRef.current === renderedFooter &&
        latestMeasuredFooterTrayIdRef.current === renderedTrayId &&
        latestMeasuredFooterFullScreenRef.current === renderedFullScreen;

      setLayoutEnabled(false);
      contentMeasuredRef.current = false;
      footerMeasuredRef.current =
        !hasFooter || footerGeometryFixed || canReuseVisibleFooterMeasurement;
      pendingOpenRef.current = true;
      syncOpenReadiness();
    },
    [
      contentHeight,
      footerHeight,
      measuredContentHeight,
      resolvedContentHeight,
      renderedFooter,
      renderedFullScreen,
      renderedTrayId,
      syncOpenReadiness,
    ],
  );

  const enableLayout = useCallback(() => {
    setLayoutEnabled(true);
  }, []);

  const setLayoutAnimationEnabled = useCallback((enabled: boolean) => {
    setLayoutEnabled(enabled);
  }, []);

  const completePendingOpen = useCallback(() => {
    // pending open ends before the UI spring starts so later layouts can animate
    pendingOpenRef.current = false;
    syncOpenReadiness();
  }, [syncOpenReadiness]);

  const prepareForClose = useCallback(() => {
    // closing disables layout animation so teardown does not morph stale content
    pendingOpenRef.current = false;
    syncOpenReadiness();
    setLayoutEnabled(false);
  }, [syncOpenReadiness]);

  const reset = useCallback(() => {
    // a full reset runs when a host slot is cleared or reassigned
    latestMeasuredContentHeightRef.current = 0;
    latestResolvedContentHeightRef.current = 0;
    latestMeasuredFooterHeightRef.current = 0;
    latestMeasuredFooterNodeRef.current = undefined;
    latestMeasuredFooterTrayIdRef.current = undefined;
    latestMeasuredFooterFullScreenRef.current = false;
    latestMeasuredTrayIdRef.current = undefined;
    lastContentLayoutRef.current = null;
    lastVisibleFooterLayoutRef.current = null;
    contentHeight.value = 0;
    footerHeight.value = 0;
    measuredContentHeight.value = 0;
    resolvedContentHeight.value = 0;
    measuredFooterHeight.value = 0;

    contentMeasuredRef.current = false;
    footerMeasuredRef.current = false;
    pendingOpenRef.current = false;
    syncOpenReadiness();
    setLayoutEnabled(false);
  }, [
    contentHeight,
    footerHeight,
    measuredContentHeight,
    measuredFooterHeight,
    resolvedContentHeight,
    syncOpenReadiness,
  ]);

  const commitContentHeight = useCallback(
    (height: number, trayId?: string, mode: TrayPresentationMode = "sheet") => {
      if (!Number.isFinite(height) || height <= 1) {
        return false;
      }

      latestMeasuredContentHeightRef.current = height;
      latestResolvedContentHeightRef.current = height;
      latestMeasuredTrayIdRef.current = trayId;
      measuredContentHeight.value = height;
      resolvedContentHeight.value = height;
      contentHeight.value = height;
      onContentHeightResolved?.(height, height, trayId, mode);

      if (!contentMeasuredRef.current && trayId !== undefined) {
        markContentMeasured();
      }

      log("CONTENT HEIGHT COMMITTED FROM SHEET FRAME", {
        height,
        mode,
        trayId,
      });

      return true;
    },
    [
      contentHeight,
      markContentMeasured,
      measuredContentHeight,
      onContentHeightResolved,
      resolvedContentHeight,
    ],
  );

  const handleContentLayout = useContentLayoutHandler({
    renderedSnapshotRef,
    renderedTrayId,
    measurementOwnerRef,
    measurementOwner,
    acceptContentMeasurement,
    contentMeasurementLeaseActive,
    contentMeasurementLeaseRef,
    renderedFullScreen,
    allowIntrinsicSheetMeasurementDuringLease,
    latestMeasuredContentHeightRef,
    latestResolvedContentHeightRef,
    originGeometryLeaseRef,
    hasRenderedBody,
    contentHeight,
    resolveContentHeight,
    preparedSheetFrameRef,
    committedSheetFrameRef,
    footerHeight,
    lastContentLayoutRef,
    latestMeasuredTrayIdRef,
    measuredContentHeight,
    resolvedContentHeight,
    onContentHeightResolved,
    onGeometryMeasured,
    onSheetContentHeightMeasured,
    contentMeasuredRef,
    markContentMeasured,
  });

  const handleVisibleFooterLayout = useVisibleFooterLayoutHandler({
    renderedSnapshotRef,
    renderedTrayId,
    renderedFooter,
    measurementOwnerRef,
    measurementOwner,
    renderedFullScreen,
    lastVisibleFooterLayoutRef,
    latestMeasuredFooterHeightRef,
    latestMeasuredFooterNodeRef,
    latestMeasuredFooterTrayIdRef,
    latestMeasuredFooterFullScreenRef,
    measuredFooterHeight,
    footerHeight,
    onGeometryMeasured,
    footerMeasuredRef,
    syncOpenReadiness,
  });

  return {
    shared: {
      measuredContentHeight,
      resolvedContentHeight,
      measuredFooterHeight,
    },
    refs: {
      latestMeasuredContentHeightRef,
      latestResolvedContentHeightRef,
      latestMeasuredFooterHeightRef,
      latestMeasuredTrayIdRef,
      measurementOwner,
    },
    state: {
      layoutEnabled,
      isReadyToOpen,
    },
    actions: {
      beginOpenMeasurement,
      commitContentHeight,
      enableLayout,
      setLayoutAnimationEnabled,
      completePendingOpen,
      prepareForClose,
      reset,
    },
    handlers: {
      handleContentLayout,
      handleVisibleFooterLayout,
    },
  };
};
