import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// drag logic stays small because dismissal feel depends on predictable thresholds
type Params = {
  translateY: { value: number };
  totalHeight: { value: number };
  context: { value: { y: number } };
  interactive: boolean;
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  onRequestClose: () => void;
};

// build the pan gesture that maps drag distance into close or snap behavior
export const useActionTrayGesture = ({
  translateY,
  totalHeight,
  context,
  interactive,
  fullScreen,
  fullScreenDraggable,
  onRequestClose,
}: Params) => {
  return useMemo(() => {
    const dragEnabled = !fullScreen || fullScreenDraggable;

    return Gesture.Pan()
      .enabled(interactive && dragEnabled)
      .onStart(() => {
        // capture current offset so a drag can start while a spring is mid flight
        context.value = { y: Math.max(0, translateY.value) };
      })

      .onUpdate((e) => {
        const raw = e.translationY + context.value.y;

        // upward pulls get resistance so the tray does not overshoot above its dock
        const resisted = raw > 0 ? raw : raw * 0.2;

        translateY.value = Math.max(0, resisted);
      })

      .onEnd((e) => {
        // combine distance and velocity so a short fast flick can still dismiss
        const closeThreshold = totalHeight.value * 0.4;

        const shouldClose =
          translateY.value > closeThreshold ||
          (translateY.value > 20 && e.velocityY > 1200);

        if (shouldClose) {
          scheduleOnRN(onRequestClose);
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
    onRequestClose,
    context,
    totalHeight,
    translateY,
  ]);
};
