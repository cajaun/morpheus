import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { log } from "../logger";
import type {
  TrayGeometrySnapshot,
  TrayMeasurementOwner,
} from "../../runtime/types";

// measurement owns the geometry contract that open animation depends on
type Params = {
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;

  renderedTrayId?: string;
  renderedFooter?: React.ReactNode;
  hasRenderedBody?: boolean;
  acceptContentMeasurement?: boolean;
  resolveContentHeight?: (measuredHeight: number) => number;
  onContentHeightResolved?: (
    resolvedHeight: number,
    measuredHeight: number,
    trayId?: string,
  ) => void;
  measurementOwner?: TrayMeasurementOwner;
  onGeometryMeasured?: (
    geometry: Partial<
      Omit<TrayGeometrySnapshot, "owner" | "capturedAt">
    >,
  ) => void;
};

export const useActionTrayMeasurements = ({
  contentHeight,
  footerHeight,
  renderedTrayId,
  renderedFooter,
  hasRenderedBody = false,
  acceptContentMeasurement = true,
  resolveContentHeight,
  onContentHeightResolved,
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

  const beginOpenMeasurement = useCallback(
    (hasFooter: boolean) => {
      // zeroing measurements avoids animating from stale geometry left by a prior step
      latestMeasuredContentHeightRef.current = 0;
      latestResolvedContentHeightRef.current = 0;
      latestMeasuredTrayIdRef.current = undefined;
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
      measuredFooterHeight,
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

  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!acceptContentMeasurement) {
        // During a fullscreen boundary the old snapshot can receive one more
        // layout after its visual viewport has changed. That frame is not a
        // measurement of either endpoint and must not poison the height cache.
        log("CONTENT onLayout ignored during boundary handoff", {
          height: e.nativeEvent.layout.height,
          trayId: renderedTrayId,
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
        });
        return;
      }

      // A body that is present cannot have a zero-sized intrinsic frame. A
      // zero frame here is an outgoing native layout pass, not a valid sheet
      // endpoint, and must not replace the last stable body measurement.
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
        });
        return;
      }

      const resolvedHeight = resolveContentHeight
        ? resolveContentHeight(height)
        : height;
      const previousResolvedHeight = latestResolvedContentHeightRef.current;

      // measured height is raw content size while resolved height respects tray policy
      latestMeasuredContentHeightRef.current = height;
      latestResolvedContentHeightRef.current = resolvedHeight;
      latestMeasuredTrayIdRef.current = renderedTrayId;
      measuredContentHeight.value = height;
      resolvedContentHeight.value = resolvedHeight;
      contentHeight.value = resolvedHeight;
      onContentHeightResolved?.(resolvedHeight, height, renderedTrayId);
      onGeometryMeasured?.({
        bodyFrame: e.nativeEvent.layout,
        measuredContentHeight: height,
        resolvedContentHeight: resolvedHeight,
      });

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
      });
    },
    [
      contentHeight,
      contentMeasured,
      acceptContentMeasurement,
      hasRenderedBody,
      measuredContentHeight,
      onContentHeightResolved,
      onGeometryMeasured,
      measurementOwner,
      renderedTrayId,
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
      onGeometryMeasured,
      renderedFooter,
    ],
  );

  const handleMeasureFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // offscreen measurement prevents the first open from guessing footer travel
      const height = e.nativeEvent.layout.height;

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
    [footerHeight, measuredFooterHeight, onGeometryMeasured],
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
