import {
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import { Platform } from "react-native";
import {
  KeyboardController,
  KeyboardEvents,
  useKeyboardState,
} from "react-native-keyboard-controller";
import {
  markTrayStepKeyboardWillShow,
} from "../../telemetry/tray-step-timing";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { log } from "../logger";

export const useTrayKeyboard = () => {
  const keyboardPreloadedRef = useRef(false);

  const preloadKeyboard = useCallback(() => {
    if (Platform.OS !== "ios" || keyboardPreloadedRef.current) {
      return;
    }

    keyboardPreloadedRef.current = true;
    KeyboardController.preload();
  }, []);

  // pay the native keyboard startup cost while the provider mounts, KeyboardController guards repeat preloads
  useEffect(() => {
    preloadKeyboard();
  }, [preloadKeyboard]);

  const anticipateKeyboard = useCallback(() => {
    preloadKeyboard();
  }, [preloadKeyboard]);

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

// the sticky host stays enabled through the native dismissal handoff
export const useSheetTrayKeyboard = ({
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
  // either source carries the target's keyboard intent, so a provisional contract cannot drop it
  const targetOwnsKeyboard = keyboardAware || targetKeyboardAware;
  // keyboard visibility bounds the lease, so hiding the keyboard needs no extra render to disable the sticky host
  const stickyEnabled =
    targetOwnsKeyboard || (keyboardLeaseRef.current && keyboardVisible);

  keyboardIntentRef.current = {
    rootTrayId,
    targetOwnsKeyboard,
    sheetStepTransition,
  };

  useEffect(() => {
    if (!isTrayInstrumentationEnabled()) {
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

  useProfiledTrayLayoutEffect("useTrayKeyboard.updateOwnership", () => {
    if (lastTransitionGenerationRef.current !== transitionGeneration) {
      lastTransitionGenerationRef.current = transitionGeneration;
      dismissIssuedRef.current = false;
    }

    const wasKeyboardOwned = keyboardOwnershipRef.current;
    const leavingKeyboardStep = wasKeyboardOwned && !targetOwnsKeyboard;
    const closingTray = wasKeyboardOwned && !visible;

    keyboardOwnershipRef.current = visible && targetOwnsKeyboard;

    // target intent enables motion at once, the lease waits for confirmed native visibility
    if (targetOwnsKeyboard && keyboardVisible) {
      keyboardLeaseRef.current = true;
    } else if (!keyboardVisible) {
      keyboardLeaseRef.current = false;
    }

    // sheet step changes never dismiss here, the focused input owns keyboard-to-keyboard handoffs and the keyboard gate dismisses for steps that leave the keyboard
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
