import React, { useCallback, useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { log } from "./logger";
import type {
  TrayTransitionContract,
  TrayTransitionLifecycle,
  TrayTransitionOptions,
} from "../runtime/types";
import { useTrayContentSync } from "./controller/use-tray-content-sync";
import { useTrayAssignmentReset } from "./controller/use-tray-assignment-reset";
import { useTrayGeometryOwnership } from "./controller/use-tray-geometry-ownership";
import { useTrayHeightCache } from "./controller/use-tray-height-cache";
import { useTrayMeasurements } from "./controller/use-tray-measurements";
import { useTrayOpenCloseLifecycle } from "./controller/use-tray-open-close-lifecycle";
import { useTrayPresentationState } from "./controller/use-tray-presentation-state";
import {
  useControllerSharedValues,
  useControllerVisualState,
} from "./controller/use-controller-boundary";
import { useShellLayoutHandler } from "./controller/use-shell-layout-handler";
import { useContentHeightRefresh } from "./controller/use-content-height-refresh";
import { useTransitionClockValues } from "./controller/use-transition-clock-values";
import { useContentHeightCallbacks } from "./controller/use-content-height-callbacks";
import { useTrayRenderState } from "./controller/use-tray-render-state";
import { useTrayTransitionCallbacks } from "./controller/use-tray-transition-callbacks";
import { useTrayTransitionDiagnostics } from "./controller/use-tray-transition-diagnostics";

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

// measurement, render and lifecycle hooks composed into one tray controller
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
    rootTrayId,
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
  const transitionClock = useTransitionClockValues(transitionContract);
  const {
    transitionStartedAt,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
    morphProgress,
  } = transitionClock;

  const presentationFullScreen = renderState.state.renderedFullScreen;
  const isEnteringFullScreen = !!fullScreen && !presentationFullScreen;
  // frame mode and keyed content change in the same commit
  const frameFullScreen = presentationFullScreen;

  // shared values read by gestures, animations and layout
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
    renderedSnapshotStore: renderState.snapshotStore,
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
    releaseSheetFrameLease,
    resetGeometry,
  } = geometry.handlers;
  const resolveRenderedContentHeight =
    presentation.helpers.resolveRenderedContentHeight;

  const { handleSheetContentHeightMeasured, resolveMeasuredContentHeight } =
    useContentHeightCallbacks({
      activeTransitionRef,
      renderedFullScreenRef,
      activeTrayIdRef,
      handleSheetFramePrepared,
      footerHeight: presentation.shared.footerHeight,
      isEnteringFullScreen,
      resolveRenderedContentHeight,
      morphProgress,
      transitionContract,
      transitionStartedGeneration,
      transitionLayoutStartedGeneration,
      transitionCompletedGeneration,
      returningToSheetRef,
      hasRenderedHeader: renderState.state.renderedHeader != null,
      trayId,
      visible,
      fullScreen,
      presentationFullScreen,
    });

  const heightCache = useTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
    measurementOwner,
  });
  // the first open spring waits until geometry is known
  const measurements = useTrayMeasurements({
    contentHeight: presentation.shared.contentHeight,
    footerHeight: presentation.shared.footerHeight,
    renderedSnapshotRef: renderState.renderedSnapshotRef,
    measurementOwnerRef: geometry.refs.measurementOwnerRef,
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
    releaseSheetFrameLease,
  });

  useContentHeightRefresh({
    visible,
    trayId,
    renderedTrayId: renderState.state.renderedTrayId,
    latestMeasuredTrayIdRef: measurements.refs.latestMeasuredTrayIdRef,
    measuredContentHeight: measurements.shared.measuredContentHeight,
    contentHeight: presentation.shared.contentHeight,
    resolveMeasuredContentHeight,
  });

  const clearRenderState = renderState.actions.clear;
  const resetMeasurements = measurements.actions.reset;

  useTrayAssignmentReset({
    assignmentId,
    resetGeometry,
    clearRenderState,
    morphProgress,
    resetMeasurements,
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

  // the open and close state machine around measured geometry
  const openCloseLifecycle = useTrayOpenCloseLifecycle({
    visible,
    rootTrayId,
    trayId,
    footer,
    onCloseComplete,
    renderState,
    measurements,
    originGeometryLeaseRef,
    resetGeometry,
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

  const handleShellLayout = useShellLayoutHandler({
    rootTrayId,
    renderedTrayIdRef,
    renderedTransitionContract,
    handleGeometryMeasured,
  });

  const imperativeApi = useMemo(
    () => ({
      open: () => {
        log("imperative open() requested");
      },
      close: () => {
        handleRequestClose();
      },
      // worklets read active state through this shared value
      isActive: () => !!presentation.shared.active.value,
    }),
    [handleRequestClose, presentation.shared.active],
  );

  // the controller boundary stays referentially stable so the visual surface can skip renders
  const shared = useControllerSharedValues(
    presentation.shared,
    transitionClock,
  );
  const contentHeightSnapshot =
    measurements.refs.latestResolvedContentHeightRef.current;
  const state = useControllerVisualState({
    renderedState: renderState.state,
    layoutEnabled: measurements.state.layoutEnabled,
    contentHeightSnapshot,
    preparedSheetFrame: geometry.state.preparedSheetFrame,
    isSurfaceReady: openCloseLifecycle.state.isSurfaceReady,
    frameFullScreen,
  });
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
    renderSnapshotStore: renderState.snapshotStore,
    renderSnapshotOverride: renderState.renderSnapshotOverride,
    handlers,
    imperativeApi,
  };
};

export type TrayController = ReturnType<typeof useTrayController>;
