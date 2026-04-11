import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { log } from "../logger";

// measurement owns the geometry contract that open animation depends on
type Params = {
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;

  renderedTrayId?: string;
  renderedFooter?: React.ReactNode;
  resolveContentHeight?: (measuredHeight: number) => number;
  onContentHeightResolved?: (
    resolvedHeight: number,
    measuredHeight: number,
    trayId?: string,
  ) => void;
};

export const useActionTrayMeasurements = ({
  contentHeight,
  footerHeight,
  renderedTrayId,
  renderedFooter,
  resolveContentHeight,
  onContentHeightResolved,
}: Params) => {
  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const [footerMeasured, setFooterMeasured] = useState(false);
  const [contentMeasured, setContentMeasured] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  // refs provide synchronous reads across layout callbacks and spring setup
  const latestMeasuredContentHeightRef = useRef(0);
  const latestResolvedContentHeightRef = useRef(0);
  const latestMeasuredFooterHeightRef = useRef(0);
  const measuredContentHeight = useSharedValue(0);
  const resolvedContentHeight = useSharedValue(0);
  const measuredFooterHeight = useSharedValue(0);

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
    setPendingOpen(false);
  }, []);

  const prepareForClose = useCallback(() => {
    setPendingOpen(false);
    setLayoutEnabled(false);
  }, []);

  const reset = useCallback(() => {
    latestMeasuredContentHeightRef.current = 0;
    latestResolvedContentHeightRef.current = 0;
    latestMeasuredFooterHeightRef.current = 0;
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
      const height = e.nativeEvent.layout.height;
      const resolvedHeight = resolveContentHeight
        ? resolveContentHeight(height)
        : height;

      // measured height is raw content size while resolved height respects tray policy
      latestMeasuredContentHeightRef.current = height;
      latestResolvedContentHeightRef.current = resolvedHeight;
      measuredContentHeight.value = height;
      resolvedContentHeight.value = resolvedHeight;
      contentHeight.value = resolvedHeight;
      onContentHeightResolved?.(resolvedHeight, height, renderedTrayId);

      if (!contentMeasured && renderedTrayId !== undefined) {
        setContentMeasured(true);
      }

      log("CONTENT onLayout", {
        height,
        resolvedHeight,
        trayId: renderedTrayId,
      });
    },
    [
      contentHeight,
      contentMeasured,
      measuredContentHeight,
      onContentHeightResolved,
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

      log("VISIBLE FOOTER onLayout", {
        height,
        measuredRef: latestMeasuredFooterHeightRef.current,
        delta: height - latestMeasuredFooterHeightRef.current,
      });

      latestMeasuredFooterHeightRef.current = height;
      measuredFooterHeight.value = height;
      footerHeight.value = height;
    },
    [footerHeight, measuredFooterHeight, renderedFooter],
  );

  const handleMeasureFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // offscreen measurement prevents the first open from guessing footer travel
      const height = e.nativeEvent.layout.height;

      log("OFFSCREEN FOOTER onLayout", { height });

      latestMeasuredFooterHeightRef.current = height;
      measuredFooterHeight.value = height;
      footerHeight.value = height;
      setFooterMeasured(true);
    },
    [footerHeight, measuredFooterHeight],
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
