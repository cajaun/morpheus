import { useCallback } from "react";
import { Platform } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import {
  KeyboardController,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";

export const useActionTrayKeyboard = () => {
  const { height: rawKeyboardHeight } = useReanimatedKeyboardAnimation();
  const keyboardHeight = useDerivedValue(() =>
    Math.max(0, -rawKeyboardHeight.value),
  );

  const anticipateKeyboard = useCallback(() => {
    if (Platform.OS === "ios") {
      KeyboardController.preload();
    }
  }, []);

  const dismissKeyboard = useCallback(() => {
    return KeyboardController.dismiss();
  }, []);

  return {
    keyboardHeight,
    anticipateKeyboard,
    dismissKeyboard,
  };
};
