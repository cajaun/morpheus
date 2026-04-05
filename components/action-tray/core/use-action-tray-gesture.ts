import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, withSpring } from "react-native-reanimated";

type Params = {
  translateY: { value: number };
  totalHeight: { value: number };
  context: { value: { y: number } };
  fullScreen: boolean;
  fullScreenDraggable: boolean;
  keyboardHeight: { value: number };
  dismissKeyboard: () => void;
  onRequestClose: () => void;
};

export const useActionTrayGesture = ({
  translateY,
  totalHeight,
  context,
  fullScreen,
  fullScreenDraggable,
  keyboardHeight,
  dismissKeyboard,
  onRequestClose,
}: Params) => {
  return useMemo(() => {
    const dragEnabled = !fullScreen || fullScreenDraggable;

    return Gesture.Pan()
      .enabled(dragEnabled)
      .onStart(() => {
        if (keyboardHeight.value > 0) {
          runOnJS(dismissKeyboard)();
        }

        context.value = { y: Math.max(0, translateY.value) };
      })

      .onUpdate((e) => {
        const raw = e.translationY + context.value.y;

        const resisted = raw > 0 ? raw : raw * 0.2;

        translateY.value = Math.max(0, resisted);
      })

      .onEnd((e) => {
        const closeThreshold = totalHeight.value * 0.4;

        const shouldClose =
          translateY.value > closeThreshold ||
          (translateY.value > 20 && e.velocityY > 1200);

        if (shouldClose) {
          runOnJS(onRequestClose)();
        } else {
          translateY.value = withSpring(0, {
            damping: 25,
            stiffness: 250,
            overshootClamping: true,
          });
        }
      });
  }, [
    dismissKeyboard,
    fullScreen,
    fullScreenDraggable,
    keyboardHeight,
    onRequestClose,
    context,
    totalHeight,
    translateY,
  ]);
};
