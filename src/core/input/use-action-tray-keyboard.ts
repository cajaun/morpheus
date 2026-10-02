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
  const keyboardPreloadedRef = useRef(false);

  const anticipateKeyboard = useCallback(() => {
    if (Platform.OS !== "ios" || keyboardPreloadedRef.current) {
      return;
    }

    keyboardPreloadedRef.current = true;
    KeyboardController.preload();
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
  targetKeyboardAware: boolean;
  sheetStepTransition: boolean;
  transitionGeneration?: number;
};

// Keep the sticky host enabled during the native dismissal handoff. This hook
// is rendered inside KeyboardProvider by the tray shell.
export const useSheetActionTrayKeyboard = ({
  visible,
  keyboardAware,
  targetKeyboardAware,
  sheetStepTransition,
  transitionGeneration,
}: SheetKeyboardParams) => {
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const keyboardOwnershipRef = useRef(false);
  const lastTransitionGenerationRef = useRef<number | undefined>(
    transitionGeneration,
  );
  const dismissIssuedRef = useRef(false);
  const [keyboardLease, setKeyboardLease] = useState(false);
  // Either source carries the target's resolved keyboard intent. Keeping the
  // values additive protects the handoff while a provisional transition
  // contract is being reconciled with the registered step options.
  const targetOwnsKeyboard = keyboardAware || targetKeyboardAware;
  const stickyEnabled = targetOwnsKeyboard || keyboardLease;

  useEffect(() => {
    log("SHEET KEYBOARD STATE", {
      visible,
      keyboardAware,
      targetKeyboardAware,
      sheetStepTransition,
      keyboardVisible,
      keyboardOwnership: keyboardOwnershipRef.current,
      keyboardLease,
      stickyEnabled,
    });
  }, [
    keyboardAware,
    keyboardLease,
    sheetStepTransition,
    keyboardVisible,
    stickyEnabled,
    targetKeyboardAware,
    visible,
  ]);

  useLayoutEffect(() => {
    if (lastTransitionGenerationRef.current !== transitionGeneration) {
      lastTransitionGenerationRef.current = transitionGeneration;
      dismissIssuedRef.current = false;
    }

    const wasKeyboardOwned = keyboardOwnershipRef.current;
    const leavingKeyboardStep = wasKeyboardOwned && !targetOwnsKeyboard;
    const closingTray = wasKeyboardOwned && !visible;

    keyboardOwnershipRef.current = visible && targetOwnsKeyboard;

    // The target intent enables motion immediately. Only acquire the lease
    // after native visibility is confirmed, avoiding an extra React render on
    // the cold regular-to-keyboard path while retaining the close handoff.
    if (targetOwnsKeyboard && keyboardVisible) {
      setKeyboardLease(true);
    } else if (!keyboardVisible) {
      setKeyboardLease(false);
    }

    // A sheet step-to-step transition must never explicitly dismiss the
    // keyboard. The focused input/native handoff owns that lifecycle; an
    // imperative dismissal here creates the visible close/reopen correction
    // when the next keyboard-aware step is still being committed.
    const shouldDismiss =
      closingTray || (leavingKeyboardStep && !sheetStepTransition);

    if (shouldDismiss && !dismissIssuedRef.current) {
      dismissIssuedRef.current = true;
      void KeyboardController.dismiss({
        keepFocus: false,
        animated: true,
      });
    }
  }, [
    keyboardAware,
    sheetStepTransition,
    keyboardVisible,
    targetKeyboardAware,
    targetOwnsKeyboard,
    transitionGeneration,
    visible,
  ]);

  return {
    stickyEnabled,
  };
};
