import React, { useCallback } from "react";
import Animated from "react-native-reanimated";
import { logTrayProfilerCommit } from "../../telemetry/tray-profiler";
import { TrayMorphProgressProvider } from "../tray-morph-progress";
import { ABSOLUTE_FILL } from "../constants";
import {
  areTraySurfacePropsEqual,
  type TrayVisualShellContentProps,
} from "./props";
import {
  TrayInteractionBackdrop,
  TrayOriginTransitionBackdrop,
} from "./backdrops";
import { TrayKeyboardStickyRegion } from "./keyboard-sticky-region";
import { TraySnapshotTelemetry } from "./snapshot-region";
import { TraySurface } from "./surface";

// the full shell tree stays behind this memo so boundary state updates rebuild a small element
export const TrayVisualShellContent = React.memo(
  ({
    assignmentId,
    rootTrayId,
    trayIdRef,
    visible,
    interactionStateRef,
    surfaceProps,
    morphProgress,
    progress,
    renderedTrayId,
    requiresFullScreenMotion,
    shouldUseOriginTransition,
    presentationFullScreen,
    renderedClassName,
    keyboardStickyCapable,
    fullScreenSurfaceStyle,
    fullScreenSurfaceFillStyle,
    renderSnapshotOverride,
  }: TrayVisualShellContentProps) => {
    // the region id names the host so a step change keeps the profiler name
    const shellId = `tray-region:${rootTrayId ?? assignmentId}:shell`;
    const handleProfileRender = useCallback<React.ProfilerOnRenderCallback>(
      (_id, phase, actualDuration, baseDuration, startTime, commitTime) =>
        logTrayProfilerCommit(
          shellId,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          {
            region: "shell",
            rootTrayId,
            trayId: trayIdRef.current,
            assignmentId,
            visible,
            interactive: interactionStateRef.current,
          },
        ),
      [
        assignmentId,
        interactionStateRef,
        rootTrayId,
        shellId,
        trayIdRef,
        visible,
      ],
    );
    const instrumentationEnabled = surfaceProps.instrumentationEnabled;
    const shell = (
      <TrayMorphProgressProvider value={morphProgress}>
        {instrumentationEnabled ? (
          <TraySnapshotTelemetry
            store={surfaceProps.renderSnapshotStore}
            override={renderSnapshotOverride}
            rootTrayId={rootTrayId}
            visible={visible}
          />
        ) : null}
        {shouldUseOriginTransition ? (
          <TrayOriginTransitionBackdrop
            isRendered={renderedTrayId !== undefined}
            originProgress={surfaceProps.originProgress}
            progress={progress}
          />
        ) : (
          <TrayInteractionBackdrop
            isRendered={renderedTrayId !== undefined}
            progress={progress}
          />
        )}
        {requiresFullScreenMotion && renderedTrayId !== undefined && (
          <Animated.View
            className={presentationFullScreen ? renderedClassName : undefined}
            pointerEvents="none"
            style={[
              ABSOLUTE_FILL,
              fullScreenSurfaceStyle,
              fullScreenSurfaceFillStyle,
              surfaceProps.dragStyle,
            ]}
          />
        )}
        {renderedTrayId !== undefined && (
          <TrayKeyboardStickyRegion
            capable={keyboardStickyCapable}
            enabled={
              !presentationFullScreen &&
              !surfaceProps.isFullScreenBoundaryTransition
            }
          >
            <TraySurface {...surfaceProps} />
          </TrayKeyboardStickyRegion>
        )}
      </TrayMorphProgressProvider>
    );

    if (!instrumentationEnabled) {
      return shell;
    }

    return (
      <React.Profiler id={shellId} onRender={handleProfileRender}>
        {shell}
      </React.Profiler>
    );
  },
  (previous, next) =>
    previous.assignmentId === next.assignmentId &&
    previous.rootTrayId === next.rootTrayId &&
    previous.trayIdRef === next.trayIdRef &&
    previous.visible === next.visible &&
    previous.interactionStateRef === next.interactionStateRef &&
    areTraySurfacePropsEqual(previous.surfaceProps, next.surfaceProps) &&
    previous.morphProgress === next.morphProgress &&
    previous.progress === next.progress &&
    previous.renderedTrayId === next.renderedTrayId &&
    previous.requiresFullScreenMotion === next.requiresFullScreenMotion &&
    previous.shouldUseOriginTransition === next.shouldUseOriginTransition &&
    previous.presentationFullScreen === next.presentationFullScreen &&
    previous.renderedClassName === next.renderedClassName &&
    previous.keyboardStickyCapable === next.keyboardStickyCapable &&
    previous.fullScreenSurfaceStyle === next.fullScreenSurfaceStyle &&
    previous.fullScreenSurfaceFillStyle === next.fullScreenSurfaceFillStyle &&
    previous.renderSnapshotOverride === next.renderSnapshotOverride,
);

TrayVisualShellContent.displayName = "TrayVisualShellContent";
