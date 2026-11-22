import React, { useMemo } from "react";
import { View } from "react-native";
import { TrayContentCommitContext } from "../tray-content-commit";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import {
  TrayParentTransitionProvider,
  type TrayParentTransition,
} from "../../runtime/tray-parent-transition";
import { styles as trayStyles } from "../animation/tray-styles";
import { TrayTransitionStartProvider } from "../transition-start";
import { TrayContentMotionDirectionProvider } from "../transition-motion-direction";
import {
  TrayGestureContext,
  TrayShellTransitionContext,
  TraySheetFrameContext,
  TraySheetLayoutAnimationContext,
} from "./contexts";
import { localStyles } from "./styles";
import { type TraySheetSurfaceProps } from "./props";
import { useSheetContentMeasurement } from "./use-sheet-content-measurement";
import { TrayRenderedNode, TraySnapshotRegion } from "./snapshot-region";

export const TrayGestureRegion = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const gesture = React.useContext(TrayGestureContext)!;

    return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
  },
);

TrayGestureRegion.displayName = "TrayGestureRegion";

// per-step transition values wrap the header and content, the gesture-bound sheet skips renders when its inputs are stable
export const TrayStepTransitionProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = React.useContext(TrayShellTransitionContext);
  const trayTransitionStart = value?.trayTransitionStart;
  const parentTransition = useMemo<TrayParentTransition | null>(
    () =>
      trayTransitionStart
        ? {
            // transitions with a shell participant complete their generation, others have nothing to wait for
            generation: trayTransitionStart.layoutStartRequired
              ? trayTransitionStart.generation
              : 0,
            completedGeneration: trayTransitionStart.completedGeneration,
          }
        : null,
    [trayTransitionStart],
  );

  if (!value) {
    return <>{children}</>;
  }

  return (
    <TrayContentMotionDirectionProvider value={value.contentMotionDirection}>
      <TrayTransitionStartProvider value={value.trayTransitionStart}>
        <TrayParentTransitionProvider value={parentTransition}>
          {children}
        </TrayParentTransitionProvider>
      </TrayTransitionStartProvider>
    </TrayContentMotionDirectionProvider>
  );
};

TrayStepTransitionProviders.displayName = "TrayStepTransitionProviders";

export const TraySheetLayoutView = ({
  leadingStyle,
  trailingStyle,
  children,
  ...viewProps
}: Omit<
  React.ComponentProps<typeof Animated.View>,
  "layout" | "style" | "className"
> & {
  leadingStyle: React.ComponentProps<typeof Animated.View>["style"];
  trailingStyle: React.ComponentProps<typeof Animated.View>["style"];
  children: React.ReactNode;
}) => {
  const value = React.useContext(TrayShellTransitionContext);
  const frame = React.useContext(TraySheetFrameContext);
  const shouldUseLayoutAnimation = React.useContext(
    TraySheetLayoutAnimationContext,
  );
  const presentationFrameStyle = frame?.presentationFrameStyle;
  // style order container, layout, frame, then container and visibility
  const style = useMemo(
    () => [leadingStyle, presentationFrameStyle, trailingStyle],
    [leadingStyle, presentationFrameStyle, trailingStyle],
  );

  return (
    <Animated.View
      {...viewProps}
      className={frame?.renderedClassName}
      style={style}
      layout={
        shouldUseLayoutAnimation ? value?.layoutAnimationConfig : undefined
      }
    >
      {children}
    </Animated.View>
  );
};

TraySheetLayoutView.displayName = "TraySheetLayoutView";

export const TraySheetSurface = React.memo(
  ({
    style,
    renderedContainerStyle,
    renderedHeader,
    renderedContent,
    renderSnapshotStore,
    renderedFullScreen,
    instrumentationEnabled,
    shouldUseLayoutAnimation,
    isFullScreenBoundaryTransition,
    handleContentLayout,
    handleShellLayout,
    footerSpacerStyle,
    contentBoundarySourceStyle,
    contentBoundarySourceViewportStyle,
    contentFrameStyle,
    contentPaddingStyle,
    contentRevealStyle,
    contentViewportStyle: contentViewportStyleInput,
    headerFrameStyle,
    trayLayoutStyle,
    dragStyle,
    surfaceVisibilityStyle,
    originSurfaceVisibilityStyle,
    fullScreenSafeAreaContentStyle,
    hasHeader,
  }: TraySheetSurfaceProps) => {
    // presentationFrameStyle and the sheet class come from context between these two halves
    const sheetLeadingStyle = useMemo(
      () => [trayStyles.container, trayLayoutStyle],
      [trayLayoutStyle],
    );
    const sheetTrailingStyle = useMemo(
      () => [
        renderedContainerStyle,
        surfaceVisibilityStyle,
        originSurfaceVisibilityStyle,
        dragStyle,
        style,
      ],
      [
        dragStyle,
        originSurfaceVisibilityStyle,
        renderedContainerStyle,
        style,
        surfaceVisibilityStyle,
      ],
    );
    const contentStyle = useMemo(
      () => [
        trayStyles.content,
        // the clock-aware frame goes last so target topology wins
        ...(isFullScreenBoundaryTransition
          ? [contentBoundarySourceStyle, contentFrameStyle]
          : [contentFrameStyle]),
        contentRevealStyle,
      ],
      [
        contentBoundarySourceStyle,
        contentFrameStyle,
        contentRevealStyle,
        isFullScreenBoundaryTransition,
      ],
    );
    const contentViewportStyle = useMemo(
      () => [
        contentPaddingStyle,
        contentBoundarySourceViewportStyle,
        contentViewportStyleInput,
        fullScreenSafeAreaContentStyle,
      ],
      [
        contentBoundarySourceViewportStyle,
        contentPaddingStyle,
        contentViewportStyleInput,
        fullScreenSafeAreaContentStyle,
      ],
    );
    const fullScreenContentStyle = useMemo(
      () => (renderedFullScreen ? { flex: 1 } : undefined),
      [renderedFullScreen],
    );
    const headerStyle = useMemo(
      () => [localStyles.headerContainer, headerFrameStyle],
      [headerFrameStyle],
    );
    const {
      contentMeasureRef,
      handleMeasuredContentLayout,
      measureCommittedContent,
      stepFooterMetrics,
      stepFooterSpacerStyle,
    } = useSheetContentMeasurement({
      handleContentLayout,
      renderedContent,
      renderedFullScreen,
      renderSnapshotStore,
    });

    // a stable body element lets React skip it when the layout-animation flag flips twice per step change
    const sheetBody = useMemo(
      () => (
        <Animated.View style={contentStyle}>
          <Animated.View style={contentViewportStyle}>
            <View
              // measure the content snapshot with a host View whose ref has synchronous Fabric measure()
              ref={contentMeasureRef}
              collapsable={false}
              onLayout={handleMeasuredContentLayout}
              style={fullScreenContentStyle}
            >
              <TrayContentCommitContext.Provider
                value={measureCommittedContent}
              >
                <TrayStepTransitionProviders>
                  {hasHeader ? (
                    <Animated.View style={headerStyle}>
                      {renderSnapshotStore ? (
                        <TraySnapshotRegion
                          store={renderSnapshotStore}
                          region="header"
                        />
                      ) : (
                        <TrayRenderedNode node={renderedHeader} />
                      )}
                    </Animated.View>
                  ) : null}
                  {renderSnapshotStore ? (
                    <TraySnapshotRegion
                      store={renderSnapshotStore}
                      region="content"
                    />
                  ) : (
                    <TrayRenderedNode node={renderedContent} />
                  )}
                </TrayStepTransitionProviders>
              </TrayContentCommitContext.Provider>
            </View>
          </Animated.View>
          {/* reserve the fixed footer's space, the footer is absolute and outside content measurement */}
          <Animated.View style={footerSpacerStyle} />
          {stepFooterMetrics ? (
            <Animated.View style={stepFooterSpacerStyle} />
          ) : null}
        </Animated.View>
      ),
      [
        contentMeasureRef,
        stepFooterMetrics,
        stepFooterSpacerStyle,
        contentStyle,
        contentViewportStyle,
        footerSpacerStyle,
        fullScreenContentStyle,
        handleMeasuredContentLayout,
        hasHeader,
        headerStyle,
        measureCommittedContent,
        renderSnapshotStore,
        renderedContent,
        renderedHeader,
      ],
    );
    const sheetTree = useMemo(
      () => (
        <TrayGestureRegion>
          <TraySheetLayoutView
            leadingStyle={sheetLeadingStyle}
            trailingStyle={sheetTrailingStyle}
            onLayout={instrumentationEnabled ? handleShellLayout : undefined}
          >
            {sheetBody}
          </TraySheetLayoutView>
        </TrayGestureRegion>
      ),
      [
        handleShellLayout,
        instrumentationEnabled,
        sheetBody,
        sheetLeadingStyle,
        sheetTrailingStyle,
      ],
    );

    return (
      <TraySheetLayoutAnimationContext.Provider
        value={shouldUseLayoutAnimation}
      >
        {sheetTree}
      </TraySheetLayoutAnimationContext.Provider>
    );
  },
);

TraySheetSurface.displayName = "TraySheetSurface";
