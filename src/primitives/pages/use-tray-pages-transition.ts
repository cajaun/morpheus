import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { LayoutChangeEvent, PixelRatio } from "react-native";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SCREEN_WIDTH } from "../../core/constants";
import type {
  TrayHostActionsValue,
  TrayTransitionLifecycle,
} from "../../runtime/types";
import { createTrayMeasurementOwner } from "../../runtime/types";
import {
  clampPageIndex,
  PAGE_SPRING_CONFIG,
} from "./model";

type Params = {
  initialPage: number;
  totalPages: number;
  trayId: string | null;
  activeStepKey: string | null;
  requestPageTransition: TrayHostActionsValue["requestPageTransition"];
  transitions: TrayTransitionLifecycle;
};

// pager transitions own page geometry and spring lifecycle
export const useTrayPagesTransition = ({
  initialPage,
  totalPages,
  trayId,
  activeStepKey,
  requestPageTransition,
  transitions,
}: Params) => {
  const resolvedInitialPage = clampPageIndex(initialPage, totalPages);
  const [pageIndex, setPageIndex] = useState(resolvedInitialPage);
  const [transitionFromIndex, setTransitionFromIndex] = useState<
    number | null
  >(null);
  const [viewportWidthState, setViewportWidthState] = useState(SCREEN_WIDTH);
  const progress = useSharedValue(resolvedInitialPage);
  const transitionTargetRef = useRef<number | null>(null);
  const transitionGenerationRef = useRef<number | null>(null);
  const viewportFrameRef = useRef<LayoutChangeEvent["nativeEvent"]["layout"] | null>(
    null,
  );
  const startedTransitionTargetRef = useRef<number | null>(null);
  const pageWidth = viewportWidthState > 0 ? viewportWidthState : SCREEN_WIDTH;

  useEffect(() => {
    const nextIndex = clampPageIndex(pageIndex, totalPages);

    if (nextIndex === pageIndex) {
      return;
    }

    transitionTargetRef.current = null;
    startedTransitionTargetRef.current = null;
    const generation = transitionGenerationRef.current;
    transitionGenerationRef.current = null;

    if (generation !== null) {
      transitions.mark(generation, "cancelled", {
        owner: "Tray.Pages",
        reason: "page-range-changed",
      });
    }

    setTransitionFromIndex(null);
    setPageIndex(nextIndex);
    progress.value = nextIndex;
  }, [pageIndex, progress, totalPages, transitions]);

  useEffect(
    () => () => {
      const generation = transitionGenerationRef.current;

      if (generation !== null) {
        transitions.mark(generation, "cancelled", {
          owner: "Tray.Pages",
          reason: "pager-unmounted",
        });
      }
    },
    [transitions],
  );

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // viewport measurement follows the rendered tray presentation
      const nextWidth = PixelRatio.roundToNearestPixel(
        event.nativeEvent.layout.width || SCREEN_WIDTH,
      );
      viewportFrameRef.current = event.nativeEvent.layout;

      if (Math.abs(nextWidth - viewportWidthState) < 0.5) {
        return;
      }

      setViewportWidthState(nextWidth);
    },
    [viewportWidthState],
  );

  const setPage = useCallback(
    (nextIndex: number) => {
      const resolvedIndex = clampPageIndex(nextIndex, totalPages);

      if (resolvedIndex === pageIndex || transitionFromIndex !== null) {
        return;
      }

      if (trayId && activeStepKey) {
        const generation = requestPageTransition(
          trayId,
          activeStepKey,
          pageIndex,
          resolvedIndex,
        );

        transitionGenerationRef.current = generation;

        if (generation !== null) {
          const transition = transitions.get(generation)?.contract;

          transitions.mark(generation, "prepared", {
            owner: "Tray.Pages",
            fromPageIndex: pageIndex,
            toPageIndex: resolvedIndex,
          });

          if (transition?.from && viewportFrameRef.current) {
            transitions.captureGeometry(generation, "source", {
              owner: createTrayMeasurementOwner({
                rootTrayId: trayId,
                endpoint: transition.from,
                generation,
              }),
              capturedAt: performance.now(),
              bodyFrame: viewportFrameRef.current,
            });
          }
        }
      }

      transitionTargetRef.current = resolvedIndex;
      setTransitionFromIndex(pageIndex);
      setPageIndex(resolvedIndex);
    },
    [
      activeStepKey,
      pageIndex,
      requestPageTransition,
      totalPages,
      transitionFromIndex,
      transitions,
      trayId,
    ],
  );

  const handlePageTransitionComplete = useCallback(
    (targetIndex: number) => {
      if (transitionTargetRef.current !== targetIndex) {
        return;
      }

      transitionTargetRef.current = null;
      startedTransitionTargetRef.current = null;
      setTransitionFromIndex(null);
      const generation = transitionGenerationRef.current;
      transitionGenerationRef.current = null;

      if (generation !== null) {
        transitions.mark(generation, "completed", {
          owner: "Tray.Pages",
          pageIndex: targetIndex,
        });
      }
    },
    [transitions],
  );

  useLayoutEffect(() => {
    if (
      transitionFromIndex === null ||
      transitionTargetRef.current !== pageIndex ||
      startedTransitionTargetRef.current === pageIndex
    ) {
      return;
    }

    startedTransitionTargetRef.current = pageIndex;
    const generation = transitionGenerationRef.current;

    if (generation !== null) {
      const transition = transitions.get(generation)?.contract;

      transitions.mark(generation, "committed", {
        owner: "Tray.Pages",
        pageIndex,
      });
      if (transition?.to && viewportFrameRef.current && trayId) {
        transitions.captureGeometry(generation, "target", {
          owner: createTrayMeasurementOwner({
            rootTrayId: trayId,
            endpoint: transition.to,
            generation,
          }),
          capturedAt: performance.now(),
          bodyFrame: viewportFrameRef.current,
        });
      }
      transitions.mark(generation, "layoutStarted", {
        owner: "Tray.Pages",
        pageIndex,
      });
    }

    progress.value = withSpring(
      pageIndex,
      PAGE_SPRING_CONFIG,
      (finished) => {
        if (finished) {
          progress.value = pageIndex;
          scheduleOnRN(handlePageTransitionComplete, pageIndex);
        }
      },
    );
  }, [
    handlePageTransitionComplete,
    pageIndex,
    progress,
    transitions,
    trayId,
    transitionFromIndex,
  ]);

  const nextPage = useCallback(() => {
    setPage(pageIndex + 1);
  }, [pageIndex, setPage]);

  const backPage = useCallback(() => {
    setPage(pageIndex - 1);
  }, [pageIndex, setPage]);

  return {
    pageIndex,
    transitionFromIndex,
    pageWidth,
    progress,
    handleViewportLayout,
    setPage,
    nextPage,
    backPage,
  };
};
