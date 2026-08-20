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
import {
  type SharedValue,
  useSharedValue,
} from "react-native-reanimated";
import { log } from "./logger";
import { SCREEN_HEIGHT, TRAY_KEYBOARD_GAP } from "./constants";
import { KeyboardTransitionMode } from "./types";
import type {
  TrayTransitionContract,
  TrayTransitionLifecycle,
  TrayTransitionOptions,
} from "../runtime/types";
import { isActionTrayInstrumentationEnabled } from "../telemetry/config";
import {
  markTrayStepShellLayout,
} from "../telemetry/tray-step-timing";
import { useActionTrayContentSync } from "./controller/use-action-tray-content-sync";
import { useActionTrayAssignmentReset } from "./controller/use-action-tray-assignment-reset";
import { useActionTrayGeometryOwnership } from "./controller/use-action-tray-geometry-ownership";
import { useActionTrayHeightCache } from "./controller/use-action-tray-height-cache";
import { useActionTrayMeasurements } from "./controller/use-action-tray-measurements";
import { useActionTrayOpenCloseLifecycle } from "./controller/use-action-tray-open-close-lifecycle";
import { useActionTrayPresentationState } from "./controller/use-action-tray-presentation-state";
import { useActionTrayRenderState } from "./controller/use-action-tray-render-state";
import { useActionTrayTransitionCallbacks } from "./controller/use-action-tray-transition-callbacks";
import { useActionTrayTransitionDiagnostics } from "./controller/use-action-tray-transition-diagnostics";

// compose tray policy before the shell renders
type Params = {
  assignmentId?: number;
  visible: boolean;
  interactive?: boolean;
  keyboardTransitionMode?: KeyboardTransitionMode;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  onCloseComplete?: () => void;
  rootTrayId?: string;
  trayId?: string;
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
  keyboardHeight: SharedValue<number>;
  dismissKeyboard: () => void;
  onClose: () => void;
};

export const useActionTrayController = ({
  assignmentId = 0,
  visible,
  interactive = true,
  keyboardTransitionMode = "idle",
  header,
  content,
  footer,
  onCloseComplete,
  rootTrayId,
  trayId,
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
  keyboardHeight,
  dismissKeyboard,
  onClose,
}: Params) => {
  // snapshot rendered content so prop streams cannot interrupt a morph
  const renderState = useActionTrayRenderState({
    content,
    header,
    footer,
    trayId,
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
  const presentation = useActionTrayPresentationState({
    visible,
    renderedFooter: renderState.state.renderedFooter,
    presentationFullScreen,
    keyboardHeight,
  });
  const renderedTransitionContract =
    renderState.state.renderedTransitionContract;
  const geometry = useActionTrayGeometryOwnership({
    visible,
    rootTrayId,
    trayId,
    fullScreen,
    presentationFullScreen,
    renderedTrayId: renderState.state.renderedTrayId,
    renderedTransitionContract,
    transitionContract,
    transitionLifecycle,
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
    contentMeasurementLeaseRef,
    renderedTrayIdRef,
  } = geometry.refs;
  const {
    handleGeometryMeasured,
    handleSheetFramePrepared,
    clearPreparedSheetFrame,
  } = geometry.handlers;
  const resolveRenderedContentHeight =
    presentation.helpers.resolveRenderedContentHeight;

  const resolveMeasuredContentHeight = useCallback(
    (measuredHeight: number) => {
      const keyboardInset =
        keyboardHeight.value > 0
          ? keyboardHeight.value + TRAY_KEYBOARD_GAP
          : 0;

      if (!isEnteringFullScreen) {
        const resolvedHeight = resolveRenderedContentHeight(measuredHeight);

        // sheet mode trusts measured content and footer policy
        log("RESOLVE CONTENT HEIGHT", {
          trayId,
          measuredHeight,
          resolvedHeight,
          visible,
          incomingFullScreen: !!fullScreen,
          renderedFullScreen: presentationFullScreen,
          isEnteringFullScreen,
          footerHeight: presentation.shared.footerHeight.value,
          keyboardInset,
          mode: "rendered-presentation",
        });

        return resolvedHeight;
      }

      const resolvedHeight = Math.max(
        0,
        SCREEN_HEIGHT - presentation.shared.footerHeight.value - keyboardInset,
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
        keyboardInset,
        mode: "entering-fullscreen",
      });

      return resolvedHeight;
    },
    [
      isEnteringFullScreen,
      keyboardHeight,
      fullScreen,
      resolveRenderedContentHeight,
      presentationFullScreen,
      presentation.shared.footerHeight,
      trayId,
      visible,
    ],
  );

  const heightCache = useActionTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
    measurementOwner,
  });
  // gate the first open spring until geometry is known
  const measurements = useActionTrayMeasurements({
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
      geometry.state.preparedSheetFrame !== undefined &&
      renderedTransitionContract?.fullScreenChanged === true,
    contentMeasurementLeaseRef,
    resolveContentHeight: resolveMeasuredContentHeight,
    onContentHeightResolved: heightCache.actions.handleContentHeightResolved,
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
  } = useActionTrayTransitionDiagnostics({
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
  } = useActionTrayTransitionCallbacks({
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

  useActionTrayAssignmentReset({
    assignmentId,
    clearPreparedSheetFrame,
    clearRenderState,
    contentMeasurementLeaseRef,
    morphProgress,
    preparedSheetFrameRef,
    resetMeasurements,
    returningToSheetRef,
    shared: {
      active: presentation.shared.active,
      animationTravel: presentation.shared.animationTravel,
      closeGeneration: presentation.shared.closeGeneration,
      originProgress: presentation.shared.originProgress,
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
  const openCloseLifecycle = useActionTrayOpenCloseLifecycle({
    visible,
    rootTrayId,
    trayId,
    footer,
    onCloseComplete,
    renderState,
    measurements,
    shared: {
      translateY: presentation.shared.translateY,
      contentHeight: presentation.shared.contentHeight,
      footerHeight: presentation.shared.footerHeight,
      active: presentation.shared.active,
      animationTravel: presentation.shared.animationTravel,
      closeGeneration: presentation.shared.closeGeneration,
      surfaceOpacity: presentation.shared.surfaceOpacity,
      originProgress: presentation.shared.originProgress,
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
  useActionTrayContentSync({
    visible,
    interactive,
    rootTrayId,
    trayId,
    fullScreen,
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
    // close requests blur inputs before letting runtime mutate the stack
    dismissKeyboard();
    onClose?.();
  }, [dismissKeyboard, onClose]);

  const handleShellLayout = useCallback(
    (event: LayoutChangeEvent) => {
      handleGeometryMeasured({ shellFrame: event.nativeEvent.layout });

      if (isActionTrayInstrumentationEnabled()) {
        markTrayStepShellLayout(rootTrayId, renderedTrayIdRef.current);
      }
    },
    [handleGeometryMeasured, renderedTrayIdRef, rootTrayId],
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

  return {
    shared: {
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
    },
    state: {
      layoutEnabled: measurements.state.layoutEnabled,
      footerMeasured: measurements.state.footerMeasured,
      contentMeasured: measurements.state.contentMeasured,
      pendingOpen: measurements.state.pendingOpen,
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
      measureFooter: measurements.state.shouldMeasureFooter
        ? renderState.state.renderedFooter
        : null,
    },
    handlers: {
      ...measurements.handlers,
      handleShellLayout,
      handleLayoutTransitionConfigured,
      handleLayoutTransitionStart,
      handleLayoutTransitionComplete,
      handleRequestClose,
    },
    imperativeApi,
  };
};
