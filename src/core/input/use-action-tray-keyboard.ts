import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { Platform } from "react-native";
import {
  KeyboardController,
  KeyboardEvents,
  useKeyboardState,
} from "react-native-keyboard-controller";
import {
  markTrayStepKeyboardWillShow,
} from "../../telemetry/tray-step-timing";
import { isActionTrayInstrumentationEnabled } from "../../telemetry/config";
import { log } from "../logger";

export const useActionTrayKeyboard = () => {
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
    anticipateKeyboard,
    dismissKeyboard,
  };
};

type SheetKeyboardParams = {
  rootTrayId?: string;
  visible: boolean;
  keyboardAware: boolean;
  targetKeyboardAware: boolean;
  sheetStepTransition: boolean;
  transitionGeneration?: number;
};

// Keep the sticky host enabled during the native dismissal handoff. This hook
// is rendered inside KeyboardProvider by the tray shell.
export const useSheetActionTrayKeyboard = ({
  rootTrayId,
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
  const keyboardLeaseRef = useRef(false);
  const keyboardIntentRef = useRef({
    rootTrayId,
    targetOwnsKeyboard: false,
    sheetStepTransition: false,
  });
  // Either source carries the target's resolved keyboard intent. Keeping the
  // values additive protects the handoff while a provisional transition
  // contract is being reconciled with the registered step options.
  const targetOwnsKeyboard = keyboardAware || targetKeyboardAware;
  // The lease is a native-dismissal handoff, not UI state. Derive its visible
  // lifetime from keyboard visibility so hiding the keyboard does not require
  // a second React render just to disable the sticky host.
  const stickyEnabled =
    targetOwnsKeyboard || (keyboardLeaseRef.current && keyboardVisible);

  keyboardIntentRef.current = {
    rootTrayId,
    targetOwnsKeyboard,
    sheetStepTransition,
  };

  useEffect(() => {
    if (!isActionTrayInstrumentationEnabled()) {
      return;
    }

    const subscription = KeyboardEvents.addListener("keyboardWillShow", () => {
      const intent = keyboardIntentRef.current;

      if (intent.sheetStepTransition && intent.targetOwnsKeyboard) {
        markTrayStepKeyboardWillShow(intent.rootTrayId);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    log("SHEET KEYBOARD STATE", {
      visible,
      keyboardAware,
      targetKeyboardAware,
      sheetStepTransition,
      keyboardVisible,
      keyboardOwnership: keyboardOwnershipRef.current,
      keyboardLease: keyboardLeaseRef.current,
      stickyEnabled,
    });
  }, [
    keyboardAware,
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
    // after native visibility is confirmed while retaining the close handoff.
    if (targetOwnsKeyboard && keyboardVisible) {
      keyboardLeaseRef.current = true;
    } else if (!keyboardVisible) {
      keyboardLeaseRef.current = false;
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
    keyboardLeaseRef,
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
