import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, withSpring } from "react-native-reanimated";

type Params = {
  fullScreen: boolean;
  translateY: { value: number };
  totalHeight: { value: number };
  context: { value: { y: number } };
  onRequestClose: () => void;
};

export const useActionTrayGesture = ({
  fullScreen,
  translateY,
  totalHeight,
  context,
  onRequestClose,
}: Params) => {
  return useMemo(() => {
    return Gesture.Pan()
      .enabled(!fullScreen)
      .onStart(() => {
        context.value = { y: translateY.value };
      })
      .onUpdate((e) => {
        if (e.translationY >= 0) {
          translateY.value = e.translationY + context.value.y;
        }
      })
      .onEnd((e) => {
        const projectedEnd = translateY.value + e.velocityY / 60;
        const shouldClose =
          projectedEnd > totalHeight.value * 0.5 || e.velocityY > 1000;

        if (shouldClose) {
          runOnJS(onRequestClose)();
        } else {
          translateY.value = withSpring(0);
        }
      });
  }, [fullScreen, onRequestClose, context, totalHeight, translateY]);
};