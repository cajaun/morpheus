import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { log } from "../logger";
import type {
  TrayGeometrySnapshot,
  TrayMeasurementOwner,
  TrayPresentationMode,
} from "../../runtime/types";
import type { ActionTraySheetFrame } from "../types/action-tray";

// measurement owns the geometry contract that open animation depends on
type Params = {
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;

  renderedTrayId?: string;
  renderedFullScreen?: boolean;
  renderedFooter?: React.ReactNode;
  hasRenderedBody?: boolean;
  acceptContentMeasurement?: boolean;
  contentMeasurementLeaseActive?: boolean;
  contentMeasurementLeaseRef?: { current: boolean };
  originGeometryLeaseRef?: { current: boolean };
  committedSheetFrameRef?: { current: ActionTraySheetFrame | undefined };
  resolveContentHeight?: (measuredHeight: number) => number;
  onContentHeightResolved?: (
    resolvedHeight: number,
    measuredHeight: number,
    trayId?: string,
    mode?: TrayPresentationMode,
  ) => void;
  onSheetContentHeightMeasured?: (
    resolvedHeight: number,
    trayId?: string,
  ) => void;
  measurementOwner?: TrayMeasurementOwner;
  onGeometryMeasured?: (
    geometry: Partial<
      Omit<TrayGeometrySnapshot, "owner" | "capturedAt">
    >,
  ) => void;
};

type LayoutSignature = {
  ownerKey?: string;
  trayId?: string;
  fullScreen: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  resolvedHeight?: number;
};

const areLayoutSignaturesEqual = (
  previous: LayoutSignature | null,
  next: LayoutSignature,
) =>
  previous !== null &&
  previous.ownerKey === next.ownerKey &&
  previous.trayId === next.trayId &&
  previous.fullScreen === next.fullScreen &&
  previous.x === next.x &&
  previous.y === next.y &&
  previous.width === next.width &&
  previous.height === next.height &&
  previous.resolvedHeight === next.resolvedHeight;

// collect body and footer measurements used to resolve shell geometry
export const useActionTrayMeasurements = ({
  contentHeight,
  footerHeight,
  renderedTrayId,
  renderedFullScreen = false,
  renderedFooter,
  hasRenderedBody = false,
  acceptContentMeasurement = true,
  contentMeasurementLeaseActive = false,
  contentMeasurementLeaseRef,
  originGeometryLeaseRef,
  committedSheetFrameRef,
  resolveContentHeight,
  onContentHeightResolved,
  onSheetContentHeightMeasured,
  measurementOwner,
  onGeometryMeasured,
}: Params) => {
  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const [footerMeasured, setFooterMeasured] = useState(false);
  const [contentMeasured, setContentMeasured] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  // refs provide synchronous reads across layout callbacks and spring setup
  const latestMeasuredContentHeightRef = useRef(0);
  const latestResolvedContentHeightRef = useRef(0);
  const latestMeasuredFooterHeightRef = useRef(0);
  const latestMeasuredTrayIdRef = useRef<string | undefined>(undefined);
  const measuredContentHeight = useSharedValue(0);
  const resolvedContentHeight = useSharedValue(0);
  const measuredFooterHeight = useSharedValue(0);
  const latestMeasurementOwnerRef = useRef(measurementOwner);
  const lastContentLayoutRef = useRef<LayoutSignature | null>(null);
  const lastVisibleFooterLayoutRef = useRef<LayoutSignature | null>(null);
  const lastMeasuredFooterLayoutRef = useRef<LayoutSignature | null>(null);
  latestMeasurementOwnerRef.current = measurementOwner;

  useEffect(() => {
    if (renderedFooter) {
      return;
    }

    // clear footer state when a step drops its footer so the old spacer disappears
    latestMeasuredFooterHeightRef.current = 0;
    measuredFooterHeight.value = 0;
    footerHeight.value = 0;
  }, [footerHeight, measuredFooterHeight, renderedFooter]);

  useEffect(() => {
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
    (hasFooter: boolean) => {
      // zeroing measurements avoids animating from stale geometry left by a prior step
      latestMeasuredContentHeightRef.current = 0;
      latestResolvedContentHeightRef.current = 0;
      latestMeasuredTrayIdRef.current = undefined;
      lastContentLayoutRef.current = null;
      lastVisibleFooterLayoutRef.current = null;
      lastMeasuredFooterLayoutRef.current = null;
      contentHeight.value = 0;
      measuredContentHeight.value = 0;
      resolvedContentHeight.value = 0;
      footerHeight.value = hasFooter ? latestMeasuredFooterHeightRef.current : 0;

      setLayoutEnabled(false);
      setContentMeasured(false);
      setFooterMeasured(!hasFooter);
      setPendingOpen(true);
    },
    [
      contentHeight,
      footerHeight,
      measuredContentHeight,
      resolvedContentHeight,
    ],
  );

  const enableLayout = useCallback(() => {
    setLayoutEnabled(true);
  }, []);

  const setLayoutAnimationEnabled = useCallback((enabled: boolean) => {
    setLayoutEnabled(enabled);
  }, []);

  const completePendingOpen = useCallback(() => {
    // pending open ends before the ui spring starts so later layouts can animate
    setPendingOpen(false);
  }, []);

  const prepareForClose = useCallback(() => {
    // closing disables layout animation so teardown does not morph stale content
    setPendingOpen(false);
    setLayoutEnabled(false);
  }, []);

  const reset = useCallback(() => {
    // full reset is used only when a host slot is cleared or reassigned
    latestMeasuredContentHeightRef.current = 0;
    latestResolvedContentHeightRef.current = 0;
    latestMeasuredFooterHeightRef.current = 0;
    latestMeasuredTrayIdRef.current = undefined;
    lastContentLayoutRef.current = null;
    lastVisibleFooterLayoutRef.current = null;
    lastMeasuredFooterLayoutRef.current = null;
    contentHeight.value = 0;
    footerHeight.value = 0;
    measuredContentHeight.value = 0;
    resolvedContentHeight.value = 0;
    measuredFooterHeight.value = 0;

    setContentMeasured(false);
    setFooterMeasured(false);
    setPendingOpen(false);
    setLayoutEnabled(false);
  }, [
    contentHeight,
    footerHeight,
    measuredContentHeight,
    measuredFooterHeight,
    resolvedContentHeight,
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

      if (!contentMeasured && trayId !== undefined) {
        setContentMeasured(true);
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
      contentMeasured,
      measuredContentHeight,
      onContentHeightResolved,
      resolvedContentHeight,
    ],
  );

  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!acceptContentMeasurement) {
        // ignore old snapshot layout frames after the fullscreen viewport changes
        log("CONTENT onLayout ignored during boundary handoff", {
          height: e.nativeEvent.layout.height,
          trayId: renderedTrayId,
          acceptContentMeasurement,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
          renderedFullScreen,
          measurementOwner: measurementOwner?.presentationKey,
        });
        return;
      }

      if (
        contentMeasurementLeaseActive ||
        contentMeasurementLeaseRef?.current === true
      ) {
        // ignore animated viewport measurements so intermediate frames cannot become sheet heights
        log("CONTENT onLayout ignored during sheet frame lease", {
          height: e.nativeEvent.layout.height,
          trayId: renderedTrayId,
          acceptContentMeasurement,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
          renderedFullScreen,
          measurementOwner: measurementOwner?.presentationKey,
          latestMeasuredContentHeight: latestMeasuredContentHeightRef.current,
          latestResolvedContentHeight: latestResolvedContentHeightRef.current,
        });
        return;
      }

      if (originGeometryLeaseRef?.current === true) {
        // trigger origin owns the target while transient fullscreen layouts drain
        log("CONTENT onLayout ignored during trigger origin lease", {
          height: e.nativeEvent.layout.height,
          trayId: renderedTrayId,
          acceptContentMeasurement,
          originGeometryLeaseActive: originGeometryLeaseRef.current,
          renderedFullScreen,
          measurementOwner: measurementOwner?.presentationKey,
          latestMeasuredContentHeight: latestMeasuredContentHeightRef.current,
          latestResolvedContentHeight: latestResolvedContentHeightRef.current,
        });
        return;
      }

      const height = e.nativeEvent.layout.height;
      const previousMeasuredHeight = latestMeasuredContentHeightRef.current;

      const callbackOwnerKey = measurementOwner?.presentationKey;
      const currentOwnerKey =
        latestMeasurementOwnerRef.current?.presentationKey;

      if (callbackOwnerKey !== currentOwnerKey) {
      log("CONTENT onLayout ignored — stale measurement owner", {
          height,
          trayId: renderedTrayId,
          callbackOwnerKey,
          currentOwnerKey,
          renderedFullScreen,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
        });
        return;
      }

      // reject zero body frames because outgoing native layout is not a valid sheet endpoint
      if (
        hasRenderedBody &&
        (!Number.isFinite(height) || height <= 1)
      ) {
        log("CONTENT onLayout ignored — invalid body endpoint", {
          height,
          trayId: renderedTrayId,
          previousMeasuredHeight,
          currentContentHeight: contentHeight.value,
          measurementOwner: currentOwnerKey,
          renderedFullScreen,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
        });
        return;
      }

      const resolvedHeight = resolveContentHeight
        ? resolveContentHeight(height)
        : height;
      const previousResolvedHeight = latestResolvedContentHeightRef.current;
      const layoutSignature: LayoutSignature = {
        ownerKey: currentOwnerKey,
        trayId: renderedTrayId,
        fullScreen: renderedFullScreen,
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height,
        resolvedHeight,
      };

      const committedSheetFrame = committedSheetFrameRef?.current;
      const committedFrameMatchesOwner =
        committedSheetFrame !== undefined &&
        measurementOwner !== undefined &&
        committedSheetFrame.generation === measurementOwner.generation &&
        committedSheetFrame.endpointKey ===
          [
            measurementOwner.trayId,
            measurementOwner.stepKey,
            measurementOwner.pageIndex ?? "step",
            measurementOwner.mode,
          ].join("::");

      if (
        committedFrameMatchesOwner &&
        Math.abs(resolvedHeight - committedSheetFrame.contentHeight) >= 0.001
      ) {
        log("CONTENT onLayout ignored — completed sheet frame owns geometry", {
          height,
          resolvedHeight,
          committedContentHeight: committedSheetFrame.contentHeight,
          committedTotalHeight: committedSheetFrame.totalHeight,
          committedGeneration: committedSheetFrame.generation,
          committedEndpointKey: committedSheetFrame.endpointKey,
          measurementOwner: measurementOwner?.presentationKey,
          renderedTrayId,
          renderedFullScreen,
        });
        return;
      }

      if (areLayoutSignaturesEqual(lastContentLayoutRef.current, layoutSignature)) {
        return;
      }

      lastContentLayoutRef.current = layoutSignature;

      // measured height is raw content size while resolved height respects tray policy
      latestMeasuredContentHeightRef.current = height;
      latestResolvedContentHeightRef.current = resolvedHeight;
      latestMeasuredTrayIdRef.current = renderedTrayId;
      measuredContentHeight.value = height;
      resolvedContentHeight.value = resolvedHeight;
      contentHeight.value = resolvedHeight;
      onContentHeightResolved?.(
        resolvedHeight,
        height,
        renderedTrayId,
        renderedFullScreen ? "fullScreen" : "sheet",
      );
      onGeometryMeasured?.({
        bodyFrame: e.nativeEvent.layout,
        measuredContentHeight: height,
        resolvedContentHeight: resolvedHeight,
      });
      if (!renderedFullScreen) {
        onSheetContentHeightMeasured?.(resolvedHeight, renderedTrayId);
      }

      if (!contentMeasured && renderedTrayId !== undefined) {
        // content is only considered ready after it belongs to a named rendered tray
        setContentMeasured(true);
      }

      log("CONTENT onLayout", {
        height,
        resolvedHeight,
        trayId: renderedTrayId,
        previousMeasuredHeight,
        previousResolvedHeight,
        currentContentHeight: contentHeight.value,
        currentFooterHeight: footerHeight.value,
        renderedFullScreen,
        acceptContentMeasurement,
        contentMeasurementLeaseActive,
        contentMeasurementLeaseRef: contentMeasurementLeaseRef?.current ?? false,
        measurementOwner: currentOwnerKey,
      });
    },
    [
      contentHeight,
      contentMeasured,
      acceptContentMeasurement,
      contentMeasurementLeaseActive,
      contentMeasurementLeaseRef,
      originGeometryLeaseRef,
      committedSheetFrameRef,
      footerHeight,
      hasRenderedBody,
      measuredContentHeight,
      onContentHeightResolved,
      onSheetContentHeightMeasured,
      onGeometryMeasured,
      measurementOwner,
      renderedTrayId,
      renderedFullScreen,
      resolvedContentHeight,
      resolveContentHeight,
    ],
  );

  const handleVisibleFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!renderedFooter) {
        return;
      }

      // visible footer measurement handles late footer changes after the first open
      const height = e.nativeEvent.layout.height;
      const layoutSignature: LayoutSignature = {
        ownerKey: measurementOwner?.presentationKey,
        trayId: renderedTrayId,
        fullScreen: renderedFullScreen,
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height,
      };

      if (
        areLayoutSignaturesEqual(
          lastVisibleFooterLayoutRef.current,
          layoutSignature,
        )
      ) {
        return;
      }

      lastVisibleFooterLayoutRef.current = layoutSignature;
      // keep the last stable footer height during transient morph out layouts
      if (height <= 1 && latestMeasuredFooterHeightRef.current > 0) {
        return;
      }

      log("VISIBLE FOOTER onLayout", {
        height,
        measuredRef: latestMeasuredFooterHeightRef.current,
        delta: height - latestMeasuredFooterHeightRef.current,
      });

      latestMeasuredFooterHeightRef.current = height;
      measuredFooterHeight.value = height;
      footerHeight.value = height;
      onGeometryMeasured?.({
        footerFrame: e.nativeEvent.layout,
        measuredFooterHeight: height,
      });
      // visible footer layouts are late updates and should not reopen measurement gates
    },
    [
      footerHeight,
      measuredFooterHeight,
      measurementOwner,
      onGeometryMeasured,
      renderedFullScreen,
      renderedFooter,
      renderedTrayId,
    ],
  );

  const handleMeasureFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // offscreen measurement prevents the first open from guessing footer travel
      const height = e.nativeEvent.layout.height;
      const layoutSignature: LayoutSignature = {
        ownerKey: measurementOwner?.presentationKey,
        trayId: renderedTrayId,
        fullScreen: renderedFullScreen,
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height,
      };

      if (
        areLayoutSignaturesEqual(
          lastMeasuredFooterLayoutRef.current,
          layoutSignature,
        )
      ) {
        return;
      }

      lastMeasuredFooterLayoutRef.current = layoutSignature;

      log("OFFSCREEN FOOTER onLayout", { height });

      latestMeasuredFooterHeightRef.current = height;
      measuredFooterHeight.value = height;
      footerHeight.value = height;
      onGeometryMeasured?.({
        footerFrame: e.nativeEvent.layout,
        measuredFooterHeight: height,
      });
      // offscreen footer measurement is the gate that lets first open begin
      setFooterMeasured(true);
    },
    [
      footerHeight,
      measuredFooterHeight,
      measurementOwner,
      onGeometryMeasured,
      renderedFullScreen,
      renderedTrayId,
    ],
  );

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
      footerMeasured,
      contentMeasured,
      pendingOpen,
      isReadyToOpen: pendingOpen && contentMeasured && footerMeasured,
      shouldMeasureFooter: !!renderedFooter && !footerMeasured,
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
      handleMeasureFooterLayout,
    },
  };
};
