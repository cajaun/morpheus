import { useCallback, useEffect, useRef } from "react";
import {
  Dimensions,
  EmitterSubscription,
  Keyboard,
  KeyboardEvent,
  Platform,
} from "react-native";
import {
  Easing,
  type EasingFunction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { log } from "../logger";

// keyboard state lives in shared values so layout can react without react round trips
const DEFAULT_KEYBOARD_DURATION = 220;
const ANTICIPATE_DURATION = 120;
const KEYBOARD_CLOSE_DURATION = 140;
const ESTIMATED_KEYBOARD_HEIGHT_RATIO = 0.355;
const MIN_ESTIMATED_KEYBOARD_HEIGHT = 300;
const MAX_ESTIMATED_KEYBOARD_HEIGHT = 352;

const KEYBOARD_EASING: Record<string, EasingFunction> = {
  easeIn: Easing.in(Easing.ease),
  easeInEaseOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  keyboard: Easing.bezierFn(0.26, 1, 0.5, 1),
  linear: Easing.linear,
};

const resolveKeyboardEasing = (easing?: string) => {
  if (!easing) {
    return Easing.out(Easing.ease);
  }

  return KEYBOARD_EASING[easing] ?? Easing.out(Easing.ease);
};

const getKeyboardOverlap = (event: KeyboardEvent) => {
  const windowHeight = Dimensions.get("window").height;

  if (event.endCoordinates?.screenY != null) {
    return Math.max(0, windowHeight - event.endCoordinates.screenY);
  }

  return Math.max(0, event.endCoordinates?.height ?? 0);
};

export const useActionTrayKeyboard = () => {
  const keyboardHeight = useSharedValue(0);
  const lastKnownKeyboardHeightRef = useRef(0);

  const estimateKeyboardHeight = useCallback(() => {
    const windowHeight = Dimensions.get("window").height;
    return Math.round(
      Math.min(
        MAX_ESTIMATED_KEYBOARD_HEIGHT,
        Math.max(
          MIN_ESTIMATED_KEYBOARD_HEIGHT,
          windowHeight * ESTIMATED_KEYBOARD_HEIGHT_RATIO,
        ),
      ),
    );
  }, []);

  const animateKeyboardHeight = useCallback(
    (nextHeight: number, event?: KeyboardEvent) => {
      const baseDuration =
        Platform.OS === "ios"
          ? Math.max(0, event?.duration ?? DEFAULT_KEYBOARD_DURATION)
          : DEFAULT_KEYBOARD_DURATION;
      const isClosing = nextHeight < keyboardHeight.value;
      const duration = isClosing
        ? Math.min(baseDuration, KEYBOARD_CLOSE_DURATION)
        : baseDuration;
      const easing = isClosing
        ? Easing.linear
        : resolveKeyboardEasing(event?.easing);

      log("KEYBOARD FRAME", {
        nextHeight,
        duration,
        isClosing,
        easing: event?.easing,
      });

      if (nextHeight > 0) {
        lastKnownKeyboardHeightRef.current = nextHeight;
      }

      keyboardHeight.value = withTiming(nextHeight, {
        duration,
        easing,
      });
    },
    [keyboardHeight],
  );

  const anticipateKeyboard = useCallback(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    if (keyboardHeight.value > 0) {
      return;
    }

    const anticipatedHeight =
      lastKnownKeyboardHeightRef.current > 0
        ? lastKnownKeyboardHeightRef.current
        : estimateKeyboardHeight();

    // ios keyboard events arrive late enough to flash without this estimate
    keyboardHeight.value = withTiming(anticipatedHeight, {
      duration: ANTICIPATE_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [estimateKeyboardHeight, keyboardHeight]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return;
    }

    const subscriptions: EmitterSubscription[] = [];

    if (Platform.OS === "ios") {
      subscriptions.push(
        Keyboard.addListener("keyboardWillShow", (event) => {
          animateKeyboardHeight(getKeyboardOverlap(event), event);
        }),
      );
      subscriptions.push(
        Keyboard.addListener("keyboardWillChangeFrame", (event) => {
          animateKeyboardHeight(getKeyboardOverlap(event), event);
        }),
      );
      subscriptions.push(
        Keyboard.addListener("keyboardWillHide", (event) => {
          animateKeyboardHeight(0, event);
        }),
      );
    } else {
      subscriptions.push(
        Keyboard.addListener("keyboardDidShow", (event) => {
          animateKeyboardHeight(getKeyboardOverlap(event), event);
        }),
      );
      subscriptions.push(
        Keyboard.addListener("keyboardDidHide", () => {
          animateKeyboardHeight(0);
        }),
      );
    }

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [animateKeyboardHeight]);

  return {
    keyboardHeight,
    anticipateKeyboard,
    dismissKeyboard,
  };
};
