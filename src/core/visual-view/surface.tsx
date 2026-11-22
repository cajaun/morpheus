import React, { useMemo, useRef } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import Animated, { useSharedValue } from "react-native-reanimated";
import { styles as trayStyles } from "../animation/tray-styles";
import { TrayOriginProgressProvider } from "../tray-origin-progress";
import {
  TrayStepFooterFrameStyleContext,
  TrayStepFooterMetricsContext,
  TrayStepFooterRegionContext,
  type TrayStepFooterMetrics,
} from "../step-footer";
import { TrayFooterInteractionContext } from "./contexts";
import { localStyles } from "./styles";
import { areTraySurfacePropsEqual, type TraySurfaceProps } from "./props";
import { TrayRenderedNode, TraySnapshotRegion } from "./snapshot-region";
import { TrayStepTransitionProviders, TraySheetSurface } from "./sheet-surface";

export const TrayFooterSurface = React.memo(
  ({
    className,
    hasFooter,
    onLayout,
    style,
    children,
  }: {
    className?: string;
    hasFooter: boolean;
    onLayout: TraySurfaceProps["handleVisibleFooterLayout"];
    style: React.ComponentProps<typeof Animated.View>["style"];
    children: React.ReactNode;
  }) => {
    const interaction = React.useContext(TrayFooterInteractionContext)!;

    return (
      <Animated.View
        className={className}
        onLayout={onLayout}
        style={style}
        pointerEvents={
          hasFooter && interaction.interactive && interaction.isSurfaceReady
            ? "auto"
            : "none"
        }
      >
        {children}
      </Animated.View>
    );
  },
);

TrayFooterSurface.displayName = "TrayFooterSurface";

export const TraySurface = React.memo(
  ({
    hasFooter,
    style,
    renderedContainerStyle,
    renderedHeader,
    renderedContent,
    renderedFooter,
    renderedFooterClassName,
    renderedFooterStyle,
    renderSnapshotStore,
    renderedFullScreen,
    instrumentationEnabled,
    shouldUseLayoutAnimation,
    isFullScreenBoundaryTransition,
    handleContentLayout,
    handleVisibleFooterLayout,
    handleShellLayout,
    footerSpacerStyle,
    contentBoundarySourceStyle,
    contentBoundarySourceViewportStyle,
    contentFrameStyle,
    contentPaddingStyle,
    contentRevealStyle,
    contentViewportStyle,
    headerFrameStyle,
    trayLayoutStyle,
    footerContainerStyle,
    stepFooterContainerStyle,
    dragStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    footerVisibilityStyle,
    footerContentFrameStyle,
    fullScreenSafeAreaContentStyle,
    originProgress,
  }: TraySurfaceProps) => {
    // region elements are stable slots whose own subscriptions update step payloads
    const surfaceContainerStyle = renderedContainerStyle;
    const surfaceFooterClassName = renderedFooterClassName;
    const surfaceFooterStyle = renderedFooterStyle;
    const surfaceHeader = renderedHeader;
    const surfaceContent = renderedContent;
    const surfaceFooter = renderedFooter;
    // per-step footer layers of trays that place Tray.Footer inside steps
    const stepFooterRegion = React.useContext(TrayStepFooterRegionContext);
    const footerInteraction = React.useContext(TrayFooterInteractionContext);
    const stepFooterHeight = useSharedValue(0);
    const stepFooterHeightRef = useRef(0);
    const remeasureContentRef = useRef<(() => void) | null>(null);
    const stepFooterMetrics = useMemo<TrayStepFooterMetrics | null>(
      () =>
        stepFooterRegion
          ? {
              heightRef: stepFooterHeightRef,
              height: stepFooterHeight,
              remeasureContentRef,
            }
          : null,
      [stepFooterHeight, stepFooterRegion],
    );
    const stepFooterInteractive =
      footerInteraction?.interactive === true &&
      footerInteraction.isSurfaceReady;
    // rendered before the sheet so the new footer measures first, its fixed frame keeps a leaving footer in place while it fades
    const stepFooterLayer = useMemo(
      () =>
        stepFooterRegion ? (
          <Animated.View
            style={[
              localStyles.stepFooterLayer,
              stepFooterContainerStyle,
              dragStyle,
              surfaceVisibilityStyle,
            ]}
            pointerEvents={stepFooterInteractive ? "box-none" : "none"}
          >
            <TrayOriginProgressProvider value={originProgress}>
              <TrayStepTransitionProviders>
                {stepFooterRegion}
              </TrayStepTransitionProviders>
            </TrayOriginProgressProvider>
          </Animated.View>
        ) : null,
      [
        dragStyle,
        originProgress,
        stepFooterContainerStyle,
        stepFooterInteractive,
        stepFooterRegion,
        surfaceVisibilityStyle,
      ],
    );

    useProfiledTrayLayoutEffect(
      "TraySurface.syncFooterFlag",
      () => {
        hasFooter.value = surfaceFooter != null;
      },
      [hasFooter, surfaceFooter],
    );

    // fixed footers stay outside the layout-animated shell and follow the morph clock across a fullscreen boundary
    const footerLayer = useMemo(
      () => (
        <TrayFooterSurface
          className={surfaceFooterClassName}
          hasFooter={Boolean(surfaceFooter)}
          onLayout={handleVisibleFooterLayout}
          style={[
            trayStyles.footer,
            dragStyle,
            surfaceFooterStyle,
            footerContainerStyle,
            footerVisibilityStyle,
          ]}
        >
          <Animated.View style={footerContentFrameStyle}>
            <TrayOriginProgressProvider value={originProgress}>
              {renderSnapshotStore ? (
                <TraySnapshotRegion
                  store={renderSnapshotStore}
                  region="footer"
                />
              ) : (
                <TrayRenderedNode node={surfaceFooter ?? null} />
              )}
            </TrayOriginProgressProvider>
          </Animated.View>
        </TrayFooterSurface>
      ),
      [
        dragStyle,
        footerContainerStyle,
        footerContentFrameStyle,
        footerVisibilityStyle,
        handleVisibleFooterLayout,
        originProgress,
        renderSnapshotStore,
        surfaceFooter,
        surfaceFooterClassName,
        surfaceFooterStyle,
      ],
    );

    return (
      <TrayStepFooterMetricsContext.Provider value={stepFooterMetrics}>
        {/* the pinned and the in-content footer share the sheet's footer grid */}
        <TrayStepFooterFrameStyleContext.Provider
          value={footerContentFrameStyle}
        >
          {stepFooterLayer}
          <TraySheetSurface
            style={style}
            renderedContainerStyle={surfaceContainerStyle}
            renderedHeader={renderSnapshotStore ? null : surfaceHeader}
            renderedContent={renderSnapshotStore ? null : surfaceContent}
            renderSnapshotStore={renderSnapshotStore}
            renderedFullScreen={renderedFullScreen}
            instrumentationEnabled={instrumentationEnabled}
            shouldUseLayoutAnimation={shouldUseLayoutAnimation}
            isFullScreenBoundaryTransition={isFullScreenBoundaryTransition}
            handleContentLayout={handleContentLayout}
            handleShellLayout={handleShellLayout}
            footerSpacerStyle={footerSpacerStyle}
            contentBoundarySourceStyle={contentBoundarySourceStyle}
            contentBoundarySourceViewportStyle={
              contentBoundarySourceViewportStyle
            }
            contentFrameStyle={contentFrameStyle}
            contentPaddingStyle={contentPaddingStyle}
            contentRevealStyle={contentRevealStyle}
            contentViewportStyle={contentViewportStyle}
            headerFrameStyle={headerFrameStyle}
            trayLayoutStyle={trayLayoutStyle}
            dragStyle={dragStyle}
            surfaceVisibilityStyle={surfaceVisibilityStyle}
            originSurfaceVisibilityStyle={originSurfaceVisibilityStyle}
            fullScreenSafeAreaContentStyle={fullScreenSafeAreaContentStyle}
            hasHeader={surfaceHeader != null}
          />
          {footerLayer}
        </TrayStepFooterFrameStyleContext.Provider>
      </TrayStepFooterMetricsContext.Provider>
    );
  },
  areTraySurfacePropsEqual,
);

TraySurface.displayName = "TraySurface";
