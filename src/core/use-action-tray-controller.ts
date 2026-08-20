import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  TrayGeometrySnapshot,
  TrayTransitionOptions,
} from "../runtime/types";
import { createTrayMeasurementOwner } from "../runtime/types";
import { isActionTrayInstrumentationEnabled } from "../telemetry/config";
import {
  markTrayStepRenderedCommit,
  markTrayStepShellLayout,
} from "../telemetry/tray-step-timing";
import { useActionTrayContentSync } from "./controller/use-action-tray-content-sync";
import { useActionTrayHeightCache } from "./controller/use-action-tray-height-cache";
import { useActionTrayMeasurements } from "./controller/use-action-tray-measurements";
import { useActionTrayOpenCloseLifecycle } from "./controller/use-action-tray-open-close-lifecycle";
import { useActionTrayPresentationState } from "./controller/use-action-tray-presentation-state";
import { useActionTrayRenderState } from "./controller/use-action-tray-render-state";
import { useActionTrayTransitionCallbacks } from "./controller/use-action-tray-transition-callbacks";
import { createTrayEndpointKey } from "./controller/action-tray-sheet-frame";
import type { ActionTraySheetFrame } from "./types/action-tray";

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
  const lastResetAssignmentIdRef = useRef(0);
  const returningToSheetRef = useRef(false);
  const [preparedSheetFrame, setPreparedSheetFrame] = useState<
    ActionTraySheetFrame | undefined
  >(undefined);
  const preparedSheetFrameRef = useRef<ActionTraySheetFrame | undefined>(
    undefined,
  );
  const contentMeasurementLeaseRef = useRef(false);
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
  const morphProgress = useSharedValue(1);
  const markLiveTransitionPhase = useCallback(
    (
      phase: "prepared" | "committed" | "layoutStarted" | "completed",
      details?: Record<string, unknown>,
      at?: number,
    ) => {
      const generation = transitionContract?.generation;

      if (generation === undefined) {
        return;
      }

      transitionLifecycle?.mark(generation, phase, details, at);
    },
    [transitionContract?.generation, transitionLifecycle],
  );
  const markPreparedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("prepared", details);
    },
    [markLiveTransitionPhase],
  );
  const markCommittedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("committed", details);
    },
    [markLiveTransitionPhase],
  );
  const markStartedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("layoutStarted", details);
    },
    [markLiveTransitionPhase],
  );
  const markCompletedTransition = useCallback(
    (details?: Record<string, unknown>) => {
      markLiveTransitionPhase("completed", details);
    },
    [markLiveTransitionPhase],
  );

  const presentationFullScreen = renderState.state.renderedFullScreen;
  const isEnteringFullScreen = !!fullScreen && !presentationFullScreen;
  const renderedTrayIdRef = useRef(renderState.state.renderedTrayId);
  renderedTrayIdRef.current = renderState.state.renderedTrayId;
  const activeTrayIdRef = useRef(trayId);
  activeTrayIdRef.current = trayId;
  const activeTransitionGenerationRef = useRef(transitionContract?.generation);
  activeTransitionGenerationRef.current = transitionContract?.generation;
  const activeTransitionRef = useRef(transitionContract);
  activeTransitionRef.current = transitionContract;
  const renderedTransitionGenerationRef = useRef(
    renderState.state.renderedTransitionContract?.generation,
  );
  const renderedTransitionRef = useRef(
    renderState.state.renderedTransitionContract,
  );
  renderedTransitionRef.current =
    renderState.state.renderedTransitionContract;
  renderedTransitionGenerationRef.current =
    renderedTransitionRef.current?.generation;
  const lastHandledLayoutCompletionGenerationRef = useRef(0);
  // keep frame mode and keyed content in the same commit
  const frameFullScreen = presentationFullScreen;

  useLayoutEffect(() => {
    if (!fullScreen && presentationFullScreen) {
      // the frame lease is published by content sync this marker only tells the layout completion callback when the return boundary is finished
      returningToSheetRef.current = true;
      return;
    }

    if (fullScreen && returningToSheetRef.current) {
      // cancel a pending sheet return if the flow moves back into fullscreen
      returningToSheetRef.current = false;
    }
  }, [fullScreen, presentationFullScreen]);

  // own shared values read by gestures animations and layout
  const presentation = useActionTrayPresentationState({
    visible,
    renderedFooter: renderState.state.renderedFooter,
    presentationFullScreen,
    keyboardHeight,
  });
  const renderedFullScreenRef = useRef(presentationFullScreen);
  renderedFullScreenRef.current = presentationFullScreen;
  // collect diagnostic frames from layout callbacks so render never reads shared values
  const latestLayoutFrameRef = useRef({
    contentHeight: 0,
    footerHeight: 0,
  });
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

  const renderedTransitionContract =
    renderState.state.renderedTransitionContract;
  const measurementEndpoint =
    renderedTransitionContract?.to ?? renderedTransitionContract?.from;
  const measurementOwner = useMemo(() => {
    if (!rootTrayId || !measurementEndpoint || !renderedTransitionContract) {
      return undefined;
    }

    return createTrayMeasurementOwner({
      rootTrayId,
      endpoint: measurementEndpoint,
      generation: renderedTransitionContract.generation,
    });
  }, [measurementEndpoint, renderedTransitionContract, rootTrayId]);
  const latestGeometryRef = useRef<TrayGeometrySnapshot | null>(null);
  const handleGeometryMeasured = useCallback(
    (
      geometry: Partial<
        Omit<TrayGeometrySnapshot, "owner" | "capturedAt">
      >,
    ) => {
      if (!measurementOwner || !renderedTransitionContract) {
        return;
      }

      const previous = latestGeometryRef.current;
      const snapshot: TrayGeometrySnapshot = {
        ...(previous?.owner.presentationKey ===
        measurementOwner.presentationKey
          ? previous
          : {}),
        ...geometry,
        owner: measurementOwner,
        capturedAt: performance.now(),
      };
      latestGeometryRef.current = snapshot;
      if (geometry.resolvedContentHeight !== undefined) {
        latestLayoutFrameRef.current.contentHeight =
          geometry.resolvedContentHeight;
      }
      if (geometry.measuredFooterHeight !== undefined) {
        latestLayoutFrameRef.current.footerHeight =
          geometry.measuredFooterHeight;
      }

      const role = renderedTransitionContract.to ? "target" : "source";
      transitionLifecycle?.captureGeometry(
        renderedTransitionContract.generation,
        role,
        snapshot,
      );
    },
    [measurementOwner, renderedTransitionContract, transitionLifecycle],
  );

  useLayoutEffect(() => {
    const source = renderedTransitionContract?.from;
    const previous = latestGeometryRef.current;

    if (!rootTrayId || !source || !previous || !renderedTransitionContract) {
      return;
    }

    transitionLifecycle?.captureGeometry(
      renderedTransitionContract.generation,
      "source",
      {
        ...previous,
        owner: createTrayMeasurementOwner({
          rootTrayId,
          endpoint: source,
          generation: renderedTransitionContract.generation,
        }),
        capturedAt: performance.now(),
      },
    );
  }, [renderedTransitionContract, rootTrayId, transitionLifecycle]);

  useLayoutEffect(() => {
    const source = transitionContract?.from;
    const previous = latestGeometryRef.current;

    if (
      visible ||
      !rootTrayId ||
      !source ||
      !previous ||
      !transitionContract
    ) {
      return;
    }

    transitionLifecycle?.captureGeometry(
      transitionContract.generation,
      "source",
      {
        ...previous,
        owner: createTrayMeasurementOwner({
          rootTrayId,
          endpoint: source,
          generation: transitionContract.generation,
        }),
        capturedAt: performance.now(),
      },
    );
  }, [
    rootTrayId,
    transitionContract,
    transitionLifecycle,
    visible,
  ]);

  const heightCache = useActionTrayHeightCache({
    fullScreen,
    contentHeight: presentation.shared.contentHeight,
    measurementOwner,
  });
  const boundarySnapshotPending =
    transitionContract?.fullScreenChanged === true &&
    (renderState.state.renderedTrayId !== trayId ||
      renderState.state.renderedFullScreen !== !!fullScreen);
  const handleSheetFramePrepared = useCallback(
    (
      height: number,
      role: "source" | "target",
      frameTrayId?: string,
    ) => {
      const activeTransition = activeTransitionRef.current;
      const endpoint =
        role === "source" ? activeTransition?.from : activeTransition?.to;

      if (
        !activeTransition ||
        !endpoint ||
        endpoint.mode !== "sheet" ||
        !Number.isFinite(height) ||
        height <= 0
      ) {
        log("SHEET FRAME IGNORED", {
          activeGeneration: activeTransition?.generation,
          frameTrayId,
          height,
          role,
          endpointKey: endpoint ? createTrayEndpointKey(endpoint) : undefined,
          endpointMode: endpoint?.mode,
        });
        return;
      }

      const frame: ActionTraySheetFrame = {
        endpointKey: createTrayEndpointKey(endpoint),
        generation: activeTransition.generation,
        totalHeight: height,
      };

      contentMeasurementLeaseRef.current = true;
      preparedSheetFrameRef.current = frame;
      setPreparedSheetFrame(frame);
      log("SHEET FRAME PREPARED", {
        activeGeneration: activeTransition.generation,
        endpointKey: frame.endpointKey,
        frameTrayId,
        generation: frame.generation,
        role,
        totalHeight: frame.totalHeight,
      });
    },
    [],
  );

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
      preparedSheetFrame !== undefined &&
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
  const clearPreparedSheetFrame = useCallback(() => {
    setPreparedSheetFrame(undefined);
  }, []);
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

  useEffect(() => {
    if (!visible) {
      return;
    }

    // keep this trace near the state owner so fullscreen race reports have one source
    log("FULLSCREEN TRANSITION STATE", {
      trayId,
      visible,
      incomingFullScreen: !!fullScreen,
      renderedFullScreen: presentationFullScreen,
      isEnteringFullScreen,
      renderedTrayId: renderState.state.renderedTrayId,
      measuredContentHeight: measurements.shared.measuredContentHeight.value,
      resolvedContentHeight: measurements.shared.resolvedContentHeight.value,
      contentHeight: presentation.shared.contentHeight.value,
      footerHeight: presentation.shared.footerHeight.value,
      layoutEnabled: measurements.state.layoutEnabled,
    });
  }, [
    fullScreen,
    isEnteringFullScreen,
    measurements.shared.measuredContentHeight,
    measurements.shared.resolvedContentHeight,
    measurements.state.layoutEnabled,
    presentation.shared.contentHeight,
    presentation.shared.footerHeight,
    presentationFullScreen,
    renderState.state.renderedTrayId,
    trayId,
    visible,
  ]);

  useLayoutEffect(() => {
    if (assignmentId <= 0) {
      return;
    }

    if (lastResetAssignmentIdRef.current === assignmentId) {
      return;
    }

    lastResetAssignmentIdRef.current = assignmentId;

    // assignment ids fence recycled native hosts from earlier close callbacks
    log("SLOT ASSIGNMENT RESET", {
      assignmentId,
    });

    // clear recycled host state before accepting a new assignment
    presentation.shared.closeGeneration.value += 1;
    presentation.shared.translateY.value = SCREEN_HEIGHT;
    presentation.shared.animationTravel.value = SCREEN_HEIGHT;
    presentation.shared.originProgress.value = 1;
    morphProgress.value = 1;
    transitionStartedGeneration.value = 0;
    transitionStartedAt.value = 0;
    transitionLayoutStartedGeneration.value = 0;
    transitionCompletedGeneration.value = 0;
    lastHandledLayoutCompletionGenerationRef.current = 0;
    presentation.shared.surfaceOpacity.value = 0;
    presentation.shared.active.value = false;
    clearRenderState();
    resetMeasurements();
    preparedSheetFrameRef.current = undefined;
    contentMeasurementLeaseRef.current = false;
    setPreparedSheetFrame(undefined);
    returningToSheetRef.current = false;
  }, [
    assignmentId,
    presentation.shared.active,
    presentation.shared.animationTravel,
    presentation.shared.closeGeneration,
    presentation.shared.originProgress,
    morphProgress,
    presentation.shared.surfaceOpacity,
    presentation.shared.translateY,
    resetMeasurements,
    clearRenderState,
    transitionStartedAt,
    transitionStartedGeneration,
    transitionLayoutStartedGeneration,
    transitionCompletedGeneration,
  ]);

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

  const handleTransitionPrepared = useCallback(
    (details: Record<string, unknown>) => {
      markLiveTransitionPhase("prepared", details);
    },
    [markLiveTransitionPhase],
  );

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

  useLayoutEffect(() => {
    const renderedTransition = renderState.state.renderedTransitionContract;

    if (
      renderedTransition &&
      renderedTransition.boundary !== "opening" &&
      renderedTransition.boundary !== "closing"
    ) {
      transitionLifecycle?.mark(
        renderedTransition.generation,
        "committed",
        { trayId: renderState.state.renderedTrayId },
      );
    }

    if (!isActionTrayInstrumentationEnabled()) {
      return;
    }

    markTrayStepRenderedCommit(
      rootTrayId,
      renderState.state.renderedTrayId,
    );
  }, [
    renderState.state.renderedTransitionContract,
    renderState.state.renderedTrayId,
    rootTrayId,
    transitionLifecycle,
  ]);

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
    [handleGeometryMeasured, rootTrayId],
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
      preparedSheetFrame,
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
