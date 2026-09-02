import { useLayoutEffect, useRef, useState } from "react";
import {
  KeyboardController,
  useKeyboardState,
} from "react-native-keyboard-controller";

type Params = {
  visible: boolean;
  keyboardAware: boolean;
};

// Keep keyboard dismissal at the same React boundary as the tray transition.
// The tray surface itself is moved by KeyboardStickyView, which owns the native
// keyboard animation clock and therefore does not compete with tray Reanimated
// layout or content transitions.
export const useActionTrayKeyboard = ({
  visible,
  keyboardAware,
}: Params) => {
  const previousKeyboardAwareRef = useRef<boolean | undefined>(undefined);
  const [keyboardLease, setKeyboardLease] = useState(false);
  const keyboardVisible = useKeyboardState((state) => state.isVisible);

  useLayoutEffect(() => {
    const wasKeyboardAware = previousKeyboardAwareRef.current === true;
    const leavingKeyboardStep = wasKeyboardAware && !keyboardAware;
    const closingTray = wasKeyboardAware && !visible;

    previousKeyboardAwareRef.current = keyboardAware;

    if (keyboardAware) {
      // Keep the sticky surface armed for the whole keyboard-aware step.
      setKeyboardLease(true);
    } else if (!keyboardVisible) {
      // A dismissed keyboard releases the lease after the native hide event.
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
    // The lease keeps the wrapper enabled while an animated dismissal is in
    // flight. The incoming flag alone would disable it one render too early.
    stickyEnabled: keyboardAware || keyboardLease,
  };
};
