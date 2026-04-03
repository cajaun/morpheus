import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
} from "./constants";
import { log } from "./logger";

type Params = {
  visible: boolean;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen: boolean;
  onClose: () => void;
};

const SPRING_CONFIG = { damping: 50, stiffness: 400, mass: 0.8 };

export const useActionTrayController = ({
  visible,
  content,
  footer,
  trayId,
  fullScreen,
  onClose,
}: Params) => {
  const { bottom } = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contentHeight = useSharedValue(0);
  const footerHeight = useSharedValue(0);
  const active = useSharedValue(false);
  const context = useSharedValue({ y: 0 });
  const hasFooter = useSharedValue(false);

  const animMargin = useSharedValue(HORIZONTAL_MARGIN);
  const animRadius = useSharedValue(BORDER_RADIUS);
  const animBottom = useSharedValue(0);
  const animMinHeight = useSharedValue(0);
  const animFullScreenBg = useSharedValue(0);

  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const [footerMeasured, setFooterMeasured] = useState(false);
  const [contentMeasured, setContentMeasured] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const [renderedFooter, setRenderedFooter] =
    useState<React.ReactNode>(footer);
  const [renderedContent, setRenderedContent] =
    useState<React.ReactNode>(content);
  const [renderedTrayId, setRenderedTrayId] = useState<string | undefined>(
    trayId,
  );

  const measuredFooterHeightRef = useRef(0);
  const justOpenedRef = useRef(false);
  const closeGenerationRef = useRef(0);

  

  useEffect(() => {
    if (!fullScreen) {
      animBottom.value = bottom;
    }
  }, [animBottom, bottom, fullScreen]);

  useEffect(() => {
    hasFooter.value = !!renderedFooter;
  }, [hasFooter, renderedFooter]);

  const totalHeight = useDerivedValue(() => {
    return contentHeight.value + footerHeight.value + bottom;
  });

  const progress = useDerivedValue(() => {
    if (totalHeight.value === 0) return 0;
    const travel = Math.min(translateY.value, totalHeight.value);
    return 1 - travel / totalHeight.value;
  });

  const applyPresentationMode = useCallback(() => {
    animMargin.value = withSpring(
      fullScreen ? 0 : HORIZONTAL_MARGIN,
      SPRING_CONFIG,
    );

    animRadius.value = withSpring(BORDER_RADIUS, SPRING_CONFIG);

    animBottom.value = withSpring(fullScreen ? 0 : bottom, SPRING_CONFIG);

    animMinHeight.value = withSpring(
      fullScreen ? SCREEN_HEIGHT : 0,
      SPRING_CONFIG,
      (finished) => {
        if (finished && fullScreen) {
          animFullScreenBg.value = 1;
        }
      },
    );
  }, [
    animBottom,
    animFullScreenBg,
    animMargin,
    animMinHeight,
    animRadius,
    bottom,
    fullScreen,
  ]);

  const resetPresentationMode = useCallback(() => {
    animMargin.value = HORIZONTAL_MARGIN;
    animRadius.value = BORDER_RADIUS;
    animBottom.value = bottom;
    animMinHeight.value = 0;
  }, [animBottom, animMargin, animMinHeight, animRadius, bottom]);

  useEffect(() => {
    if (visible) {
      applyPresentationMode();
    }
  }, [applyPresentationMode, visible]);

  useEffect(() => {
    if (!visible) {
      resetPresentationMode();
    }
  }, [resetPresentationMode, visible]);

  const doOpenSpring = useCallback(() => {
    log("doOpenSpring", {
      footer: measuredFooterHeightRef.current,
      content: contentHeight.value,
    });

    footerHeight.value = measuredFooterHeightRef.current;

    translateY.value = withSpring(0, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(log)("OPEN SPRING FINISHED");
        runOnJS(setLayoutEnabled)(true);
      }
    });

    active.value = true;
  }, [active, contentHeight, footerHeight, translateY]);

  const resetContent = useCallback(() => {
    log("resetContent()");
    contentHeight.value = 0;
    setContentMeasured(false);
    setRenderedContent(null);
    setRenderedFooter(null);
    setRenderedTrayId(undefined);
    setLayoutEnabled(false);
  }, [contentHeight]);

  const checkAndReset = useCallback(
    (capturedGeneration: number) => {
      if (closeGenerationRef.current === capturedGeneration) {
        log("CLOSE SPRING FINISHED — resetting content");
        resetContent();
      } else {
        log(
          "CLOSE SPRING — stale, skipping resetContent",
          capturedGeneration,
          closeGenerationRef.current,
        );
      }
    },
    [resetContent],
  );

useEffect(() => {
  if (visible) {
    translateY.value = SCREEN_HEIGHT;
    closeGenerationRef.current += 1;
    justOpenedRef.current = true;

    log("OPEN START", {
      trayId,
      footerMeasured,
      contentMeasured,
      footer: measuredFooterHeightRef.current,
      hadExistingContent: renderedTrayId !== undefined,
      existingTrayId: renderedTrayId,
    });

    setRenderedTrayId(trayId);
    setRenderedContent(content);
    setRenderedFooter(footer);

    setLayoutEnabled(false);
    setContentMeasured(false);
    setFooterMeasured(false);

    const needsFooter = !!footer;

    if (!contentMeasured || (needsFooter && !footerMeasured)) {
      log("OPEN — waiting for measurement");
      setPendingOpen(true);
    } else {
      doOpenSpring();
    }
  } else {
    log("CLOSE START", { renderedTrayId });

    const myGeneration = ++closeGenerationRef.current;

    setPendingOpen(false);
    setLayoutEnabled(false);
    active.value = false;
    animFullScreenBg.value = 0;

    translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(checkAndReset)(myGeneration);
      }
    });
  }
}, [visible]); 

  useEffect(() => {
    const needsFooter = !!renderedFooter;

    if (!pendingOpen || !contentMeasured || (needsFooter && !footerMeasured)) {
      return;
    }

    log("PENDING OPEN — all measurements ready", {
      footer: measuredFooterHeightRef.current,
      content: contentHeight.value,
      needsFooter,
    });

    setPendingOpen(false);
    doOpenSpring();
  }, [
    contentHeight,
    contentMeasured,
    doOpenSpring,
    footerMeasured,
    pendingOpen,
    renderedFooter,
  ]);

useEffect(() => {
  if (!visible) return;

  if (justOpenedRef.current) {
    justOpenedRef.current = false;
    return;
  }

  log("TRAY CHANGE", { trayId });

  animFullScreenBg.value = 0;
  setLayoutEnabled(!fullScreen);

  if (fullScreen) {
    // Lock floor before content swap so tray can't shrink
    animMinHeight.value = contentHeight.value;
  }

  // Always apply — handles both expanding TO fullScreen
  // and resetting animMinHeight/margin/radius back when leaving it
  applyPresentationMode();

  setRenderedContent(content);
  setRenderedFooter(footer);
  setRenderedTrayId(trayId);
}, [animFullScreenBg, animMinHeight, applyPresentationMode, content, contentHeight, footer, fullScreen, trayId, visible]);

  useEffect(() => {
    log("RENDERED CONTENT CHANGED", {
      trayId: renderedTrayId,
      hasContent: renderedContent !== null,
    });
  }, [renderedContent, renderedTrayId]);

  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      contentHeight.value = h;

      if (!contentMeasured && renderedTrayId !== undefined) {
        setContentMeasured(true);
      }

      log("CONTENT onLayout", { height: h, trayId: renderedTrayId });
    },
    [contentHeight, contentMeasured, renderedTrayId],
  );

  const handleVisibleFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!renderedFooter) return;

      const h = e.nativeEvent.layout.height;

      log("VISIBLE FOOTER onLayout", {
        height: h,
        measuredRef: measuredFooterHeightRef.current,
        delta: h - measuredFooterHeightRef.current,
      });

      footerHeight.value = h;
    },
    [footerHeight, renderedFooter],
  );

  const handleMeasureFooterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      log("OFFSCREEN FOOTER onLayout", { height: h });
      measuredFooterHeightRef.current = h;
      footerHeight.value = h;
      setFooterMeasured(true);
    },
    [footerHeight],
  );

  const handleRequestClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const imperativeApi = useMemo(
    () => ({
      open: () => {
        log("imperative open() requested");
      },
      close: () => {
        handleRequestClose();
      },
      isActive: () => !!active.value,
    }),
    [active, handleRequestClose],
  );

  return {
    shared: {
      translateY,
      contentHeight,
      footerHeight,
      active,
      context,
      hasFooter,
      animMargin,
      animRadius,
      animBottom,
      animMinHeight,
      animFullScreenBg,
      totalHeight,
      progress,
    },
    state: {
      layoutEnabled,
      footerMeasured,
      contentMeasured,
      pendingOpen,
      renderedFooter,
      renderedContent,
      renderedTrayId,
    },
    handlers: {
      handleContentLayout,
      handleVisibleFooterLayout,
      handleMeasureFooterLayout,
      handleRequestClose,
    },
    imperativeApi,
  };
};