import React, { forwardRef, useImperativeHandle } from "react";
import { ActionTrayVisualView } from "./action-tray-visual-view";
import { useActionTrayController } from "./use-action-tray-controller";
import type { ActionTrayProps, ActionTrayRef } from "./types";

// Keep React state, measurement, and transition lifecycle ownership in the
// host. The visual/native subtree is isolated so unrelated controller commits
// do not re-run gesture, keyboard, or animated-style hooks.
const ActionTray = forwardRef<ActionTrayRef, ActionTrayProps>(
  (
    {
      assignmentId = 0,
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
    const controller = useActionTrayController({
      assignmentId,
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

    return (
      <ActionTrayVisualView
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
        shared={controller.shared}
        state={controller.state}
        handlers={controller.handlers}
      />
    );
  },
);

ActionTray.displayName = "ActionTray";

export { ActionTray };
