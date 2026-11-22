import React, { useMemo, useRef } from "react";
import { useTrayGesture } from "../input/use-tray-gesture";
import {
  TrayGestureContext,
  TrayFooterInteractionContext,
  TrayBackdropInteractionContext,
  TrayKeyboardStickyContext,
} from "./contexts";
import { type TrayVisualViewBodyProps } from "./props";
import { TrayVisualShell } from "./shell";

export const NOOP_TRAY_CLOSE = () => {};

// keyboard and interaction changes reach their consumers without rerunning the shell's animation policy
export const TrayVisualViewBody = React.memo(
  ({ keyboardStickyEnabled, ...props }: TrayVisualViewBodyProps) => {
    const {
      assignmentId = 0,
      prepared = false,
      rootTrayId,
      keyboardStickyCapable = true,
      fullScreenMotionCapable = true,
      fullScreen,
      dismissible = true,
      transitionContract,
      visible,
      interactive = true,
      isSurfaceReady,
      fullScreenDraggable,
      shared,
      state,
      handlers,
      ...shellProps
    } = props;
    const interactionStateRef = useRef(interactive);
    interactionStateRef.current = interactive;

    const gesture = useTrayGesture({
      translateY: shared.translateY,
      totalHeight: shared.totalHeight,
      context: shared.context,
      interactive: interactive && isSurfaceReady && dismissible,
      fullScreen: state.renderedFullScreen,
      fullScreenDraggable,
      onRequestClose: handlers.handleRequestClose,
    });
    const shellHandlers = useMemo(
      () => ({
        handleContentLayout: handlers.handleContentLayout,
        handleVisibleFooterLayout: handlers.handleVisibleFooterLayout,
        handleShellLayout: handlers.handleShellLayout,
        handleLayoutTransitionConfigured:
          handlers.handleLayoutTransitionConfigured,
        handleLayoutTransitionStart: handlers.handleLayoutTransitionStart,
        handleLayoutTransitionComplete: handlers.handleLayoutTransitionComplete,
      }),
      [
        handlers.handleContentLayout,
        handlers.handleVisibleFooterLayout,
        handlers.handleShellLayout,
        handlers.handleLayoutTransitionConfigured,
        handlers.handleLayoutTransitionStart,
        handlers.handleLayoutTransitionComplete,
      ],
    );
    const footerInteraction = useMemo(
      () => ({ interactive, isSurfaceReady }),
      [interactive, isSurfaceReady],
    );
    const onRequestClose = dismissible
      ? handlers.handleRequestClose
      : NOOP_TRAY_CLOSE;
    const backdropInteraction = useMemo(
      () => ({ interactive, onRequestClose }),
      [interactive, onRequestClose],
    );

    return (
      <TrayBackdropInteractionContext.Provider value={backdropInteraction}>
        <TrayGestureContext.Provider value={gesture}>
          <TrayFooterInteractionContext.Provider value={footerInteraction}>
            <TrayKeyboardStickyContext.Provider value={keyboardStickyEnabled}>
              <TrayVisualShell
                {...shellProps}
                assignmentId={assignmentId}
                prepared={prepared}
                rootTrayId={rootTrayId}
                keyboardStickyCapable={keyboardStickyCapable}
                fullScreenMotionCapable={fullScreenMotionCapable}
                fullScreen={fullScreen}
                transitionContract={transitionContract}
                visible={visible}
                shared={shared}
                state={state}
                handlers={shellHandlers}
                interactionStateRef={interactionStateRef}
              />
            </TrayKeyboardStickyContext.Provider>
          </TrayFooterInteractionContext.Provider>
        </TrayGestureContext.Provider>
      </TrayBackdropInteractionContext.Provider>
    );
  },
);

TrayVisualViewBody.displayName = "TrayVisualViewBody";
