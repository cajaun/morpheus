import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  type LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { log } from "./logger";
import { SCREEN_HEIGHT } from "./constants";
import {
  resolveBoundaryProgress,
  resolveFullscreenReturnHeaderPadding,
} from "./animation/frame-style-math";
import type {
  TrayTransitionContract,
  TrayTransitionLifecycle,
  TrayTransitionOptions,
} from "../runtime/types";
import { isTrayInstrumentationEnabled } from "../telemetry/config";
import {
  markTrayStepShellLayout,
} from "../telemetry/tray-step-timing";
import { markTrayBoundaryShellLayout } from "../telemetry/tray-boundary-timing";
import { useTrayContentSync } from "./controller/use-tray-content-sync";
import { useTrayAssignmentReset } from "./controller/use-tray-assignment-reset";
import { useTrayGeometryOwnership } from "./controller/use-tray-geometry-ownership";
import { useTrayHeightCache } from "./controller/use-tray-height-cache";
import { useTrayMeasurements } from "./controller/use-tray-measurements";
import { useTrayOpenCloseLifecycle } from "./controller/use-tray-open-close-lifecycle";
import { useTrayPresentationState } from "./controller/use-tray-presentation-state";
import { useTrayRenderState } from "./controller/use-tray-render-state";
import { useTrayTransitionCallbacks } from "./controller/use-tray-transition-callbacks";
import { useTrayTransitionDiagnostics } from "./controller/use-tray-transition-diagnostics";

// compose tray policy before the shell renders
type Params = {
  assignmentId?: number;
  prepared?: boolean;
  visible: boolean;
  interactive?: boolean;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  trayId?: string;
  keyboardAware?: boolean;
  fullScreen?: boolean;
  fullScreenBackgroundScale?: number;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  transition?: TrayTransitionOptions;
  transitionContract?: TrayTransitionContract | null;
  transitionLifecycle?: TrayTransitionLifecycle;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  onClose: () => void;
};

// compose measurement render and lifecycle hooks into one tray controller
export const useTrayController = ({
  assignmentId = 0,
  prepared = false,
  visible,
  interactive = true,
  header,
  content,
  footer,
  onCloseComplete,
  rootTrayId,
  trayId,
  keyboardAware,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  transition,
  transitionContract,
  transitionLifecycle,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  onClose,
}: Params) => {
  // snapshot rendered content so prop streams cannot interrupt a morph
  const renderState = useTrayRenderState({
    prepared,
    visible,
    content,
    header,
    footer,
    trayId,
    keyboardAware,
    fullScreen,
    fullScreenBackgroundScale,
    fullScreenSafeAreaTop,
    fullScreenDraggable,
    containerStyle,
    className,
    footerStyle,
    footerClassName,
    transitionContract,
  });
  const transitionStartedGeneration = useSharedValue(0);
  const transitionStartedAt = useSharedValue(0);
  const transitionLayoutStartedGeneration = useSharedValue(0);
  const transitionCompletedGeneration = useSharedValue(0);
  const transitionGenerationValue = useSharedValue(
    transitionContract?.generation ?? 0,
  );
  const fullScreenChangedValue = useSharedValue(
    transitionContract?.fullScreenChanged ? 1 : 0,
  );
  const morphProgress = useSharedValue(1);

  useLayoutEffect(() => {
    // keep exiting content on the current transition descriptor
    transitionGenerationValue.value = transitionContract?.generation ?? 0;
    fullScreenChangedValue.value = transitionContract?.fullScreenChanged
      ? 1
      : 0;
  }, [
    fullScreenChangedValue,
    transitionContract?.fullScreenChanged,
    transitionContract?.generation,
    transitionGenerationValue,
  ]);

  const presentationFullScreen = renderState.state.renderedFullScreen;
  const isEnteringFullScreen = !!fullScreen && !presentationFullScreen;
  // keep frame mode and keyed content in the same commit
  const frameFullScreen = presentationFullScreen;

  // own shared values read by gestures animations and layout
  const presentation = useTrayPresentationState({
    visible,
    renderedFooter: renderState.state.renderedFooter,
    presentationFullScreen,
  });
  const renderedTransitionContract =
    renderState.state.renderedTransitionContract;
  const geometry = useTrayGeometryOwnership({
    visible,
    rootTrayId,
    trayId,
    fullScreen,
    presentationFullScreen,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedTransitionContract,
    transitionContract,
    transitionLifecycle,
    transitionCompletedGeneration,
  });
  const { measurementOwner, boundarySnapshotPending } = geometry.state;
  const {
    activeTrayIdRef,
    activeTransitionGenerationRef,
    activeTransitionRef,
    renderedFullScreenRef,
    renderedTransitionGenerationRef,
    renderedTransitionRef,
    lastHandledLayoutCompletionGenerationRef,
    returningToSheetRef,
    latestLayoutFrameRef,
    preparedSheetFrameRef,
    committedSheetFrameRef,
    contentMeasurementLeaseRef,
    originGeometryLeaseRef,
    renderedTrayIdRef,
  } = geometry.refs;
  const {
    handleGeometryMeasured,
    handleSheetFramePrepared,
    clearPreparedSheetFrame,
  } = geometry.handlers;
  const resolveRenderedContentHeight =
    presentation.helpers.resolveRenderedContentHeight;

  const handleSheetContentHeightMeasured = useCallback(
    (resolvedHeight: number, measuredTrayId?: string) => {
      const activeTransition = activeTransitionRef.current;

      if (
        !activeTransition ||
        !activeTransition.fullScreenChanged ||
        activeTransition.to?.mode !== "sheet" ||
        renderedFullScreenRef.current ||
        activeTrayIdRef.current !== measuredTrayId ||
        !Number.isFinite(resolvedHeight) ||
        resolvedHeight <= 1
      ) {
        return;
      }

      const footer = presentation.shared.footerHeight.value;
      handleSheetFramePrepared(
        resolvedHeight + footer,
        "target",
        resolvedHeight,
        measuredTrayId,
      );
    },
    [
      activeTrayIdRef,
      activeTransitionRef,
      handleSheetFramePrepared,
      presentation.shared.footerHeight,
      renderedFullScreenRef,
    ],
  );

  const resolveMeasuredContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!isEnteringFullScreen) {
        const resolvedHeight = resolveRenderedContentHeight(measuredHeight);

        // The fullscreen header transition owns a temporary bottom gap. It
        // is visual spacing, not intrinsic sheet content. Remove its current
        // lifecycle-owned contribution before the return frame is cached so a
        // fullscreen-only 16pt gap cannot become permanent sheet geometry.
        const returningHeaderPadding =
          resolveFullscreenReturnHeaderPadding({
            progress: resolveBoundaryProgress(
              morphProgress.value,
              transitionContract?.generation,
              transitionStartedGeneration.value,
              transitionLayoutStartedGeneration.value,
              transitionCompletedGeneration.value,
              transitionContract?.fullScreenChanged === true,
            ),
            returningToSheet:
              returningToSheetRef.current &&
              transitionContract?.fullScreenChanged === true &&
              transitionContract.to?.mode === "sheet",
            hasHeader: renderState.state.renderedHeader != null,
          });
        const intrinsicSheetHeight = Math.max(
          0,
          resolvedHeight - returningHeaderPadding,
        );

        // sheet mode trusts measured content and footer policy
        log("RESOLVE CONTENT HEIGHT", {
          trayId,
          measuredHeight,
          resolvedHeight,
          returningHeaderPadding,
          intrinsicSheetHeight,
          visible,
          incomingFullScreen: !!fullScreen,
          renderedFullScreen: presentationFullScreen,
          isEnteringFullScreen,
          footerHeight: presentation.shared.footerHeight.value,
          mode: "rendered-presentation",
        });

        return intrinsicSheetHeight;
      }

      const resolvedHeight = Math.max(
        0,
        SCREEN_HEIGHT - presentation.shared.footerHeight.value,
      );

      // entering fullscreen uses viewport math before fullscreen content has settled
      log("RESOLVE CONTENT HEIGHT", {
        trayId,
        measuredHeight,
        resolvedHeight,
        visible,
        incomingFullScreen: !!fullScreen,
        renderedFullScreen: presentationFullScreen,
        isEnteringFullScreen,
        footerHeight: presentation.shared.footerHeight.value,
        mode: "entering-fullscreen",
      });

      return resolvedHeight;
    },
    [
      isEnteringFullScreen,
      fullScreen,
      morphProgress,
      renderState.state.renderedHeader,
      resolveRenderedContentHeight,
      presentationFullScreen,
      returningToSheetRef,
      presentation.shared.footerHeight,
      transitionCompletedGeneration,
      transitionContract,
      transitionLayoutStartedGeneration,
      transitionStartedGeneration,
      trayId,
      visible,
    ],
  );

  const heightCache = useTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
    measurementOwner,
  });
  // gate the first open spring until geometry is known
  const measurements = useTrayMeasurements({
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedFullScreen: renderState.state.renderedFullScreen,
    renderedFooter: renderState.state.renderedFooter,
    hasRenderedBody:
      renderState.state.renderedHeader !== null ||
      renderState.state.renderedContent !== null,
    acceptContentMeasurement: !boundarySnapshotPending,
    contentMeasurementLeaseActive:
      geometry.state.preparedSheetFrame !== undefined,
    contentMeasurementLeaseRef,
    allowIntrinsicSheetMeasurementDuringLease:
      transitionContract?.fullScreenChanged === true &&
      transitionContract.to?.mode === "sheet",
    originGeometryLeaseRef,
    preparedSheetFrameRef,
    committedSheetFrameRef,
    resolveContentHeight: resolveMeasuredContentHeight,
    onContentHeightResolved: heightCache.actions.handleContentHeightResolved,
    onSheetContentHeightMeasured: handleSheetContentHeightMeasured,
    measurementOwner,
    onGeometryMeasured: handleGeometryMeasured,
  });
  const commitStableContentHeight =
    measurements.actions.commitContentHeight;
  const measuredFooterHeightRef =
    measurements.refs.latestMeasuredFooterHeightRef;
  const {
    markPreparedTransition,
    markCommittedTransition,
    markStartedTransition,
    markCompletedTransition,
  } = useTrayTransitionDiagnostics({
    fullScreen,
    isEnteringFullScreen,
    measuredContentHeight: measurements.shared.measuredContentHeight,
    layoutEnabled: measurements.state.layoutEnabled,
    presentationContentHeight: presentation.shared.contentHeight,
    presentationFooterHeight: presentation.shared.footerHeight,
    renderedFullScreen: presentationFullScreen,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedTransitionContract: renderState.state.renderedTransitionContract,
    resolvedContentHeight: measurements.shared.resolvedContentHeight,
    rootTrayId,
    trayId,
    transitionContract,
    transitionLifecycle,
    visible,
  });
  const {
    handleLayoutTransitionConfigured,
    handleLayoutTransitionStart,
    handleLayoutTransitionComplete,
  } = useTrayTransitionCallbacks({
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
    footerHeight: presentation.shared.footerHeight,
    commitStableContentHeight,
    clearPreparedSheetFrame,
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    // ignore live prop changes until the rendered snapshot and last measurement match
    if (
      renderState.state.renderedTrayId !== trayId ||
      measurements.refs.latestMeasuredTrayIdRef.current !==
        renderState.state.renderedTrayId
    ) {
      return;
    }

    if (measurements.shared.measuredContentHeight.value <= 0) {
      return;
    }

    // refresh the shared content height when keyboard or presentation policy changes
    presentation.shared.contentHeight.value =
      resolveMeasuredContentHeight(measurements.shared.measuredContentHeight.value);
  }, [
    measurements.shared.measuredContentHeight,
    measurements.refs.latestMeasuredTrayIdRef,
    resolveMeasuredContentHeight,
    presentation.shared.contentHeight,
    renderState.state.renderedTrayId,
    trayId,
    visible,
  ]);

  const clearRenderState = renderState.actions.clear;
  const resetMeasurements = measurements.actions.reset;

  useTrayAssignmentReset({
    assignmentId,
    clearPreparedSheetFrame,
    clearRenderState,
    contentMeasurementLeaseRef,
    originGeometryLeaseRef,
    morphProgress,
    preparedSheetFrameRef,
    committedSheetFrameRef,
    resetMeasurements,
    returningToSheetRef,
    shared: {
      active: presentation.shared.active,
      animationTravel: presentation.shared.animationTravel,
      closeGeneration: presentation.shared.closeGeneration,
      originProgress: presentation.shared.originProgress,
      originTargetContentHeight: presentation.shared.originTargetContentHeight,
      surfaceOpacity: presentation.shared.surfaceOpacity,
      translateY: presentation.shared.translateY,
    },
    transition: {
      completedGeneration: transitionCompletedGeneration,
      layoutStartedGeneration: transitionLayoutStartedGeneration,
      startedAt: transitionStartedAt,
      startedGeneration: transitionStartedGeneration,
      lastHandledLayoutCompletionGenerationRef,
    },
  });

  // run the open close state machine around measured geometry
  const openCloseLifecycle = useTrayOpenCloseLifecycle({
    visible,
    rootTrayId,
    trayId,
    footer,
    onCloseComplete,
    renderState,
    measurements,
    originGeometryLeaseRef,
    shared: {
      translateY: presentation.shared.translateY,
      contentHeight: presentation.shared.contentHeight,
      footerHeight: presentation.shared.footerHeight,
      active: presentation.shared.active,
      animationTravel: presentation.shared.animationTravel,
      closeGeneration: presentation.shared.closeGeneration,
      surfaceOpacity: presentation.shared.surfaceOpacity,
      originProgress: presentation.shared.originProgress,
      originTargetContentHeight: presentation.shared.originTargetContentHeight,
    },
    resolveClosedTranslateY: presentation.helpers.resolveClosedTranslateY,
    transition,
    onTransitionPrepared: markPreparedTransition,
    onTransitionCommitted: markCommittedTransition,
    onTransitionStarted: markStartedTransition,
    onTransitionCompleted: markCompletedTransition,
  });

  const handleTransitionPrepared = markPreparedTransition;

  // publish content snapshots without breaking transition continuity
  useTrayContentSync({
    visible,
    interactive,
    rootTrayId,
    trayId,
    fullScreen,
    keyboardAware,
    transitionContract,
    fullScreenBackgroundScale,
    content,
    header,
    footer,
    containerStyle,
    className,
    footerStyle,
    footerClassName,
    justOpenedRef: openCloseLifecycle.refs.justOpenedRef,
    measurements,
    renderState,
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    morphProgress,
    resolveIncomingContentHeight: resolveMeasuredContentHeight,
    restoreContentHeight: heightCache.actions.restoreContentHeight,
    readCachedSheetContentHeight:
      heightCache.actions.readCachedSheetContentHeight,
    onSheetFramePrepared: handleSheetFramePrepared,
    onPrepared: handleTransitionPrepared,
  });

  const handleRequestClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleShellLayout = useCallback(
    (event: LayoutChangeEvent) => {
      handleGeometryMeasured({ shellFrame: event.nativeEvent.layout });

      if (isTrayInstrumentationEnabled()) {
        markTrayStepShellLayout(
          rootTrayId,
          renderedTrayIdRef.current,
          renderedTransitionContract?.generation,
        );
        markTrayBoundaryShellLayout(
          rootTrayId,
          renderedTransitionContract,
          renderedTrayIdRef.current,
        );
      }
    },
    [
      handleGeometryMeasured,
      renderedTrayIdRef,
      renderedTransitionContract,
      rootTrayId,
    ],
  );

  const imperativeApi = useMemo(
    () => ({
      open: () => {
        log("imperative open() requested");
      },
      close: () => {
        handleRequestClose();
      },
      // expose active state through the shared value read by worklets
      isActive: () => !!presentation.shared.active.value,
    }),
    [handleRequestClose, presentation.shared.active],
  );

  // Keep the controller boundary referentially stable. The host owns the
  // controller lifecycle, while the visual surface can now skip a render
  // when none of its actual inputs changed.
  const shared = useMemo(
    () => ({
      translateY: presentation.shared.translateY,
      contentHeight: presentation.shared.contentHeight,
      footerHeight: presentation.shared.footerHeight,
      active: presentation.shared.active,
      context: presentation.shared.context,
      hasFooter: presentation.shared.hasFooter,
      surfaceOpacity: presentation.shared.surfaceOpacity,
      totalHeight: presentation.shared.totalHeight,
      progress: presentation.shared.progress,
      originProgress: presentation.shared.originProgress,
      morphProgress,
      transitionGenerationValue,
      fullScreenChangedValue,
      transitionStartedAt,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
      originTargetContentHeight: presentation.shared.originTargetContentHeight,
    }),
    [
      presentation.shared.active,
      presentation.shared.contentHeight,
      presentation.shared.context,
      presentation.shared.footerHeight,
      presentation.shared.hasFooter,
      presentation.shared.originProgress,
      presentation.shared.originTargetContentHeight,
      presentation.shared.progress,
      presentation.shared.surfaceOpacity,
      presentation.shared.totalHeight,
      presentation.shared.translateY,
      morphProgress,
      transitionCompletedGeneration,
      transitionGenerationValue,
      transitionLayoutStartedGeneration,
      transitionStartedAt,
      transitionStartedGeneration,
      fullScreenChangedValue,
    ],
  );
  const contentHeightSnapshot =
    measurements.refs.latestResolvedContentHeightRef.current;
  const state = useMemo(
    () => ({
      layoutEnabled: measurements.state.layoutEnabled,
      footerMeasured: measurements.state.footerMeasured,
      contentMeasured: measurements.state.contentMeasured,
      pendingOpen: measurements.state.pendingOpen,
      contentHeightSnapshot,
      preparedSheetFrame: geometry.state.preparedSheetFrame,
      isSurfaceReady: openCloseLifecycle.state.isSurfaceReady,
      renderedFooter: renderState.state.renderedFooter,
      renderedHeader: renderState.state.renderedHeader,
      renderedContent: renderState.state.renderedContent,
      renderedTrayId: renderState.state.renderedTrayId,
      renderedFullScreen: renderState.state.renderedFullScreen,
      renderedFullScreenBackgroundScale:
        renderState.state.renderedFullScreenBackgroundScale,
      frameFullScreen,
      renderedFullScreenDraggable:
        renderState.state.renderedFullScreenDraggable,
      renderedFullScreenSafeAreaTop:
        renderState.state.renderedFullScreenSafeAreaTop,
      renderedContainerStyle: renderState.state.renderedContainerStyle,
      renderedClassName: renderState.state.renderedClassName,
      renderedFooterStyle: renderState.state.renderedFooterStyle,
      renderedFooterClassName: renderState.state.renderedFooterClassName,
    }),
    [
      contentHeightSnapshot,
      frameFullScreen,
      geometry.state.preparedSheetFrame,
      measurements.state.contentMeasured,
      measurements.state.footerMeasured,
      measurements.state.layoutEnabled,
      measurements.state.pendingOpen,
      openCloseLifecycle.state.isSurfaceReady,
      renderState.state.renderedClassName,
      renderState.state.renderedContainerStyle,
      renderState.state.renderedContent,
      renderState.state.renderedFooter,
      renderState.state.renderedFooterClassName,
      renderState.state.renderedFooterStyle,
      renderState.state.renderedFullScreen,
      renderState.state.renderedFullScreenBackgroundScale,
      renderState.state.renderedFullScreenDraggable,
      renderState.state.renderedFullScreenSafeAreaTop,
      renderState.state.renderedHeader,
      renderState.state.renderedTrayId,
    ],
  );
  const {
    handleContentLayout,
    handleVisibleFooterLayout,
  } = measurements.handlers;
  const handlers = useMemo(
    () => ({
      handleContentLayout,
      handleVisibleFooterLayout,
      handleShellLayout,
      handleLayoutTransitionConfigured,
      handleLayoutTransitionStart,
      handleLayoutTransitionComplete,
      handleRequestClose,
    }),
    [
      handleLayoutTransitionComplete,
      handleLayoutTransitionConfigured,
      handleLayoutTransitionStart,
      handleRequestClose,
      handleShellLayout,
      handleContentLayout,
      handleVisibleFooterLayout,
    ],
  );

  return {
    shared,
    state,
    handlers,
    imperativeApi,
  };
};

export type TrayController = ReturnType<typeof useTrayController>;
