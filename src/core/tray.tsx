import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { TrayVisualView } from "./tray-visual-view";
import { useTrayController } from "./use-tray-controller";
import type { TrayProps, TrayRef } from "./types";

// Keep React state, measurement, and transition lifecycle ownership in the
// host. The visual/native subtree is isolated so unrelated controller commits
// do not re-run gesture, keyboard, or animated-style hooks.
const Tray = forwardRef<TrayRef, TrayProps>(
  (
    {
      assignmentId = 0,
      prepared = false,
      style,
      onClose,
      onCloseComplete,
      rootTrayId,
      content,
      header,
      footer,
      trayId,
      fullScreen,
      fullScreenBackgroundScale,
      fullScreenSafeAreaTop,
      fullScreenDraggable,
      dismissible = true,
      transition,
      transitionContract,
      transitionLifecycle,
      visible,
      interactive = true,
      keyboardAware,
      containerStyle,
      className,
      footerClassName,
      footerStyle,
    },
    ref,
  ) => {
    const controller = useTrayController({
      assignmentId,
      prepared,
      visible,
      interactive,
      content,
      header,
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
    });

    useImperativeHandle(ref, () => controller.imperativeApi, [
      controller.imperativeApi,
    ]);

    const visualShared = useMemo(
      () => ({
        translateY: controller.shared.translateY,
        contentHeight: controller.shared.contentHeight,
        footerHeight: controller.shared.footerHeight,
        context: controller.shared.context,
        hasFooter: controller.shared.hasFooter,
        surfaceOpacity: controller.shared.surfaceOpacity,
        totalHeight: controller.shared.totalHeight,
        progress: controller.shared.progress,
        originProgress: controller.shared.originProgress,
        originTargetContentHeight: controller.shared.originTargetContentHeight,
        morphProgress: controller.shared.morphProgress,
        transitionGenerationValue:
          controller.shared.transitionGenerationValue,
        fullScreenChangedValue: controller.shared.fullScreenChangedValue,
        transitionStartedAt: controller.shared.transitionStartedAt,
        transitionStartedGeneration:
          controller.shared.transitionStartedGeneration,
        transitionLayoutStartedGeneration:
          controller.shared.transitionLayoutStartedGeneration,
        transitionCompletedGeneration:
          controller.shared.transitionCompletedGeneration,
      }),
      [
        controller.shared.contentHeight,
        controller.shared.context,
        controller.shared.footerHeight,
        controller.shared.fullScreenChangedValue,
        controller.shared.hasFooter,
        controller.shared.morphProgress,
        controller.shared.originProgress,
        controller.shared.originTargetContentHeight,
        controller.shared.progress,
        controller.shared.surfaceOpacity,
        controller.shared.totalHeight,
        controller.shared.transitionCompletedGeneration,
        controller.shared.transitionGenerationValue,
        controller.shared.transitionLayoutStartedGeneration,
        controller.shared.transitionStartedAt,
        controller.shared.transitionStartedGeneration,
        controller.shared.translateY,
      ],
    );
    const visualState = useMemo(
      () => ({
        layoutEnabled: controller.state.layoutEnabled,
        contentHeightSnapshot: controller.state.contentHeightSnapshot,
        isSurfaceReady: controller.state.isSurfaceReady,
        preparedSheetFrame: controller.state.preparedSheetFrame,
        renderedHeader: controller.state.renderedHeader,
        renderedFooter: controller.state.renderedFooter,
        renderedContent: controller.state.renderedContent,
        renderedTrayId: controller.state.renderedTrayId,
        renderedFullScreen: controller.state.renderedFullScreen,
        renderedFullScreenBackgroundScale:
          controller.state.renderedFullScreenBackgroundScale,
        frameFullScreen: controller.state.frameFullScreen,
        renderedFullScreenSafeAreaTop:
          controller.state.renderedFullScreenSafeAreaTop,
        renderedFullScreenDraggable:
          controller.state.renderedFullScreenDraggable,
        renderedContainerStyle: controller.state.renderedContainerStyle,
        renderedClassName: controller.state.renderedClassName,
        renderedFooterStyle: controller.state.renderedFooterStyle,
        renderedFooterClassName: controller.state.renderedFooterClassName,
      }),
      [
        controller.state.contentHeightSnapshot,
        controller.state.frameFullScreen,
        controller.state.isSurfaceReady,
        controller.state.layoutEnabled,
        controller.state.preparedSheetFrame,
        controller.state.renderedClassName,
        controller.state.renderedContainerStyle,
        controller.state.renderedContent,
        controller.state.renderedFooter,
        controller.state.renderedFooterClassName,
        controller.state.renderedFooterStyle,
        controller.state.renderedFullScreen,
        controller.state.renderedFullScreenBackgroundScale,
        controller.state.renderedFullScreenDraggable,
        controller.state.renderedFullScreenSafeAreaTop,
        controller.state.renderedHeader,
        controller.state.renderedTrayId,
      ],
    );

    return (
      <TrayVisualView
        assignmentId={assignmentId}
        style={style}
        rootTrayId={rootTrayId}
        trayId={trayId}
        fullScreen={fullScreen}
        dismissible={dismissible}
        transition={transition}
        transitionContract={transitionContract}
        visible={visible}
        interactive={interactive}
        keyboardAware={keyboardAware}
        shared={visualShared}
        state={visualState}
        handlers={controller.handlers}
      />
    );
  },
);

Tray.displayName = "Tray";

export { Tray };
