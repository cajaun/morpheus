import React from "react";
import Animated from "react-native-reanimated";
import { recordTrayTelemetry } from "../../telemetry/tray-telemetry-buffer";
import { useTrayAnimatedStyles } from "../animation/use-tray-animated-styles";
import { useTrayBoundaryMotionState } from "../animation/use-tray-boundary-motion-state";
import type { TrayController } from "../use-tray-controller";
import { type TrayRenderSnapshotStore } from "../controller/use-tray-render-state";
import type { RenderedTrayState, TrayProps } from "../types";

export type TrayVisualViewProps = Pick<
  TrayProps,
  | "assignmentId"
  | "prepared"
  | "style"
  | "rootTrayId"
  | "trayId"
  | "keyboardStickyCapable"
  | "fullScreenMotionCapable"
  | "fullScreen"
  | "dismissible"
  | "transition"
  | "transitionContract"
  | "visible"
  | "interactive"
  | "keyboardAware"
> & {
  isSurfaceReady: boolean;
  fullScreenDraggable: boolean;
  shared: Pick<
    TrayController["shared"],
    | "translateY"
    | "contentHeight"
    | "footerHeight"
    | "context"
    | "hasFooter"
    | "surfaceOpacity"
    | "totalHeight"
    | "progress"
    | "originProgress"
    | "originTargetContentHeight"
    | "morphProgress"
    | "transitionGenerationValue"
    | "fullScreenChangedValue"
    | "transitionStartedAt"
    | "transitionStartedGeneration"
    | "transitionLayoutStartedGeneration"
    | "transitionCompletedGeneration"
  >;
  state: Pick<
    TrayController["state"],
    | "layoutEnabled"
    | "contentHeightSnapshot"
    | "preparedSheetFrame"
    | "renderedHeader"
    | "renderedFooter"
    | "renderedContent"
    | "renderedTrayId"
    | "renderedFullScreen"
    | "renderedFullScreenBackgroundScale"
    | "frameFullScreen"
    | "renderedFullScreenSafeAreaTop"
    | "renderedContainerStyle"
    | "renderedClassName"
    | "renderedFooterStyle"
    | "renderedFooterClassName"
  >;
  renderSnapshotStore?: TrayRenderSnapshotStore;
  renderSnapshotOverride?: RenderedTrayState;
  handlers: TrayController["handlers"];
};

export type TrayVisualShellProps = Omit<
  TrayVisualViewProps,
  | "isSurfaceReady"
  | "fullScreenDraggable"
  | "keyboardAware"
  | "interactive"
  | "dismissible"
  | "handlers"
> & {
  handlers: Omit<TrayController["handlers"], "handleRequestClose">;
  interactionStateRef: { current: boolean };
};

// node identities are no input to shell policy when the region topology is unchanged
export const areTrayVisualShellStatesEqual = (
  previous: TrayVisualShellProps["state"],
  next: TrayVisualShellProps["state"],
  hasSnapshotStore: boolean,
) =>
  previous.layoutEnabled === next.layoutEnabled &&
  previous.contentHeightSnapshot === next.contentHeightSnapshot &&
  previous.preparedSheetFrame === next.preparedSheetFrame &&
  (hasSnapshotStore
    ? Boolean(previous.renderedHeader) === Boolean(next.renderedHeader) &&
      Boolean(previous.renderedContent) === Boolean(next.renderedContent) &&
      Boolean(previous.renderedFooter) === Boolean(next.renderedFooter) &&
      (previous.renderedHeader != null) === (next.renderedHeader != null) &&
      (previous.renderedContent != null) === (next.renderedContent != null) &&
      (previous.renderedFooter != null) === (next.renderedFooter != null)
    : previous.renderedHeader === next.renderedHeader &&
      previous.renderedContent === next.renderedContent &&
      previous.renderedFooter === next.renderedFooter) &&
  previous.renderedTrayId === next.renderedTrayId &&
  previous.renderedFullScreen === next.renderedFullScreen &&
  previous.renderedFullScreenBackgroundScale ===
    next.renderedFullScreenBackgroundScale &&
  previous.frameFullScreen === next.frameFullScreen &&
  previous.renderedFullScreenSafeAreaTop ===
    next.renderedFullScreenSafeAreaTop &&
  previous.renderedContainerStyle === next.renderedContainerStyle &&
  previous.renderedClassName === next.renderedClassName &&
  previous.renderedFooterStyle === next.renderedFooterStyle &&
  previous.renderedFooterClassName === next.renderedFooterClassName;

export const areTrayVisualShellPropsEqual = (
  previous: TrayVisualShellProps,
  next: TrayVisualShellProps,
) =>
  previous.assignmentId === next.assignmentId &&
  previous.prepared === next.prepared &&
  previous.style === next.style &&
  previous.rootTrayId === next.rootTrayId &&
  previous.trayId === next.trayId &&
  previous.keyboardStickyCapable === next.keyboardStickyCapable &&
  previous.fullScreenMotionCapable === next.fullScreenMotionCapable &&
  previous.fullScreen === next.fullScreen &&
  previous.transition === next.transition &&
  previous.transitionContract === next.transitionContract &&
  previous.visible === next.visible &&
  previous.shared === next.shared &&
  previous.renderSnapshotStore === next.renderSnapshotStore &&
  previous.renderSnapshotOverride === next.renderSnapshotOverride &&
  previous.handlers === next.handlers &&
  previous.interactionStateRef === next.interactionStateRef &&
  areTrayVisualShellStatesEqual(
    previous.state,
    next.state,
    previous.renderSnapshotStore !== undefined,
  );

export type TrayAnimatedStyles = ReturnType<typeof useTrayAnimatedStyles>;

export type TrayBoundaryStyles = ReturnType<typeof useTrayBoundaryMotionState>;

export type TrayBoundaryMotionParams = Omit<
  Parameters<typeof useTrayBoundaryMotionState>[0],
  "safeAreaTopInset" | "backgroundScale"
>;

export type TraySurfaceProps = Pick<
  TrayAnimatedStyles,
  | "contentBoundarySourceStyle"
  | "contentBoundarySourceViewportStyle"
  | "contentFrameStyle"
  | "contentPaddingStyle"
  | "contentRevealStyle"
  | "contentViewportStyle"
  | "dragStyle"
  | "footerContainerStyle"
  | "stepFooterContainerStyle"
  | "footerContentFrameStyle"
  | "footerSpacerStyle"
  | "footerVisibilityStyle"
  | "headerFrameStyle"
  | "surfaceVisibilityStyle"
  | "originSurfaceVisibilityStyle"
  | "trayLayoutStyle"
> &
  Partial<Pick<TrayBoundaryStyles, "fullScreenSafeAreaContentStyle">> &
  Pick<
    TrayController["handlers"],
    "handleContentLayout" | "handleVisibleFooterLayout" | "handleShellLayout"
  > & {
    hasFooter: TrayController["shared"]["hasFooter"];
    style?: TrayProps["style"];
    renderedContainerStyle?: TrayProps["containerStyle"];
    renderedHeader: React.ReactNode;
    renderedContent: React.ReactNode;
    renderedFooter: React.ReactNode;
    renderedFooterClassName?: string;
    renderedFooterStyle?: TrayProps["footerStyle"];
    renderSnapshotStore?: TrayRenderSnapshotStore;
    renderedFullScreen: boolean;
    originProgress: TrayController["shared"]["originProgress"];
    instrumentationEnabled: boolean;
    shouldUseLayoutAnimation: boolean;
    isFullScreenBoundaryTransition: boolean;
  };

// a second memo boundary skips React work when a controller update changes nothing this surface reads
export const recordChangedSurfaceProps = (
  previous: TraySurfaceProps,
  next: TraySurfaceProps,
) => {
  const previousProps = previous as unknown as Record<string, unknown>;
  const nextProps = next as unknown as Record<string, unknown>;
  const changed = Object.keys(nextProps).filter(
    (key) => previousProps[key] !== nextProps[key],
  );

  if (changed.length > 0) {
    recordTrayTelemetry("TraySurfacePropsChanged", { changed });
  }
};

export const areTraySurfacePropsEqual = (
  previous: TraySurfaceProps,
  next: TraySurfaceProps,
) => {
  if (next.instrumentationEnabled) {
    // names the props that defeat this memo boundary
    recordChangedSurfaceProps(previous, next);
  }

  const hasSameRegionShape =
    (previous.renderedHeader != null) === (next.renderedHeader != null) &&
    (previous.renderedContent != null) === (next.renderedContent != null) &&
    (previous.renderedFooter != null) === (next.renderedFooter != null);

  if (
    !hasSameRegionShape ||
    previous.renderSnapshotStore !== next.renderSnapshotStore
  ) {
    return false;
  }

  if (previous.renderSnapshotStore == null) {
    if (
      previous.renderedHeader !== next.renderedHeader ||
      previous.renderedContent !== next.renderedContent ||
      previous.renderedFooter !== next.renderedFooter
    ) {
      return false;
    }
  }

  return (
    previous.hasFooter === next.hasFooter &&
    previous.style === next.style &&
    previous.renderedContainerStyle === next.renderedContainerStyle &&
    previous.renderedFooterClassName === next.renderedFooterClassName &&
    previous.renderedFooterStyle === next.renderedFooterStyle &&
    previous.renderedFullScreen === next.renderedFullScreen &&
    previous.instrumentationEnabled === next.instrumentationEnabled &&
    previous.shouldUseLayoutAnimation === next.shouldUseLayoutAnimation &&
    previous.isFullScreenBoundaryTransition ===
      next.isFullScreenBoundaryTransition &&
    previous.handleContentLayout === next.handleContentLayout &&
    previous.handleVisibleFooterLayout === next.handleVisibleFooterLayout &&
    previous.handleShellLayout === next.handleShellLayout &&
    previous.footerSpacerStyle === next.footerSpacerStyle &&
    previous.contentBoundarySourceStyle === next.contentBoundarySourceStyle &&
    previous.contentBoundarySourceViewportStyle ===
      next.contentBoundarySourceViewportStyle &&
    previous.contentFrameStyle === next.contentFrameStyle &&
    previous.contentPaddingStyle === next.contentPaddingStyle &&
    previous.contentRevealStyle === next.contentRevealStyle &&
    previous.contentViewportStyle === next.contentViewportStyle &&
    previous.headerFrameStyle === next.headerFrameStyle &&
    previous.trayLayoutStyle === next.trayLayoutStyle &&
    previous.footerContainerStyle === next.footerContainerStyle &&
    previous.stepFooterContainerStyle === next.stepFooterContainerStyle &&
    previous.dragStyle === next.dragStyle &&
    previous.surfaceVisibilityStyle === next.surfaceVisibilityStyle &&
    previous.originSurfaceVisibilityStyle ===
      next.originSurfaceVisibilityStyle &&
    previous.footerVisibilityStyle === next.footerVisibilityStyle &&
    previous.footerContentFrameStyle === next.footerContentFrameStyle &&
    previous.fullScreenSafeAreaContentStyle ===
      next.fullScreenSafeAreaContentStyle &&
    previous.originProgress === next.originProgress
  );
};

export type TraySheetSurfaceProps = Pick<
  TraySurfaceProps,
  | "style"
  | "renderedContainerStyle"
  | "renderedHeader"
  | "renderedContent"
  | "renderSnapshotStore"
  | "renderedFullScreen"
  | "instrumentationEnabled"
  | "shouldUseLayoutAnimation"
  | "isFullScreenBoundaryTransition"
  | "handleContentLayout"
  | "handleShellLayout"
  | "footerSpacerStyle"
  | "contentBoundarySourceStyle"
  | "contentBoundarySourceViewportStyle"
  | "contentFrameStyle"
  | "contentPaddingStyle"
  | "contentRevealStyle"
  | "contentViewportStyle"
  | "headerFrameStyle"
  | "trayLayoutStyle"
  | "dragStyle"
  | "surfaceVisibilityStyle"
  | "originSurfaceVisibilityStyle"
  | "fullScreenSafeAreaContentStyle"
> & {
  hasHeader: boolean;
};

export type TrayVisualShellContentProps = {
  assignmentId: number;
  rootTrayId: TrayVisualViewProps["rootTrayId"];
  trayIdRef: { current: TrayVisualViewProps["trayId"] };
  visible: TrayVisualViewProps["visible"];
  interactionStateRef: { current: boolean };
  surfaceProps: TraySurfaceProps;
  morphProgress: TrayController["shared"]["morphProgress"];
  progress: TrayController["shared"]["progress"];
  renderedTrayId: TrayVisualViewProps["state"]["renderedTrayId"];
  requiresFullScreenMotion: boolean;
  shouldUseOriginTransition: boolean;
  presentationFullScreen: boolean;
  renderedClassName?: string;
  keyboardStickyCapable: boolean;
  fullScreenSurfaceStyle: React.ComponentProps<typeof Animated.View>["style"];
  fullScreenSurfaceFillStyle: React.ComponentProps<
    typeof Animated.View
  >["style"];
  renderSnapshotOverride?: TrayVisualViewProps["renderSnapshotOverride"];
};

export type TrayVisualViewBodyProps = TrayVisualViewProps & {
  keyboardStickyEnabled: boolean;
};
