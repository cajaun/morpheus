import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import {
  KeyboardController,
  useKeyboardState,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import { log } from "../logger";

// Legacy runtime values remain available for the existing focus API.
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

type SheetKeyboardParams = {
  visible: boolean;
  keyboardAware: boolean;
};

// Keep the sticky host enabled during the native dismissal handoff. This hook
// is rendered inside KeyboardProvider by the tray shell.
export const useSheetActionTrayKeyboard = ({
  visible,
  keyboardAware,
}: SheetKeyboardParams) => {
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const previousKeyboardAwareRef = useRef<boolean | undefined>(undefined);
  const [keyboardLease, setKeyboardLease] = useState(false);
  const stickyEnabled = keyboardAware || keyboardLease;

  useEffect(() => {
    log("SHEET KEYBOARD STATE", {
      visible,
      keyboardAware,
      keyboardVisible,
      keyboardLease,
      stickyEnabled,
    });
  }, [keyboardAware, keyboardLease, keyboardVisible, stickyEnabled, visible]);

  useLayoutEffect(() => {
    const wasKeyboardAware = previousKeyboardAwareRef.current === true;
    const leavingKeyboardStep = wasKeyboardAware && !keyboardAware;
    const closingTray = wasKeyboardAware && !visible;

    previousKeyboardAwareRef.current = keyboardAware;

    if (keyboardAware) {
      setKeyboardLease(true);
    } else if (!keyboardVisible) {
      setKeyboardLease(false);
    }

    if (leavingKeyboardStep || closingTray) {
      void KeyboardController.dismiss({
        keepFocus: false,
        animated: true,
      });
    }
  }, [keyboardAware, keyboardVisible, visible]);

  return {
    stickyEnabled,
  };
};
