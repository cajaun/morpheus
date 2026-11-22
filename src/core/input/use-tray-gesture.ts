import { useCallback, useMemo, useRef } from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import { Gesture } from "react-native-gesture-handler";
import { withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type Params = {
  translateY: { value: number };
  totalHeight: { value: number };
  context: { value: { y: number } };
  interactive: boolean;
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  onRequestClose: () => void;
};

// the pan gesture maps drag distance into close or snap
export const useTrayGesture = ({
  translateY,
  totalHeight,
  context,
  interactive,
  fullScreen,
  fullScreenDraggable,
  onRequestClose,
}: Params) => {
  // gesture worklets stay stable when a parent replaces its close callback, the ref dispatches the latest one
  const onRequestCloseRef = useRef(onRequestClose);
  useProfiledTrayLayoutEffect("useTrayGesture.updateCloseHandler", () => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);
  const requestClose = useCallback(() => {
    onRequestCloseRef.current();
  }, []);

  return useMemo(() => {
    const dragEnabled = !fullScreen || fullScreenDraggable;

    return Gesture.Pan()
      .enabled(interactive && dragEnabled)
      .onStart(() => {
        // capture the current offset so a drag can start mid-spring
        context.value = { y: Math.max(0, translateY.value) };
      })

      .onUpdate((e) => {
        const raw = e.translationY + context.value.y;

        // upward pulls get resistance so the tray never overshoots its dock
        const resisted = raw > 0 ? raw : raw * 0.2;

        translateY.value = Math.max(0, resisted);
      })

      .onEnd((e) => {
        // distance and velocity combine so a short fast flick can dismiss
        const closeThreshold = totalHeight.value * 0.4;

        const shouldClose =
          translateY.value > closeThreshold ||
          (translateY.value > 20 && e.velocityY > 1200);

        if (shouldClose) {
          scheduleOnRN(requestClose);
        } else {
          translateY.value = withSpring(0, {
            damping: 25,
            stiffness: 250,
            overshootClamping: true,
          });
        }
      });
  }, [
    fullScreen,
    fullScreenDraggable,
    interactive,
    requestClose,
    context,
    totalHeight,
    translateY,
  ]);
};
