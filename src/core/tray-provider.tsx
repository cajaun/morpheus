import React, { useCallback, useRef } from "react";
import { StyleSheet, TextInput } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useActionTrayKeyboard } from "./input/use-action-tray-keyboard";
import { PresentedActionTray } from "./presenter/presented-action-tray";
import { TrayBackgroundScaleProvider } from "../runtime/tray-background-scale";
import { TrayStoreProvider } from "../runtime/tray-context";
import { TrayPresenter } from "../runtime/tray-presenter";
import { useTrayFocusManager } from "../runtime/use-tray-focus-manager";
import { useTrayRuntime } from "../runtime/use-tray-runtime";

// integration boundary between runtime state and the native animated renderer
export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const keyboardHandoffRef = useRef<TextInput>(null);
  const { keyboardHeight, dismissKeyboard, anticipateKeyboard } =
    useActionTrayKeyboard();
  const { registerFocusable, dismissFocusedInputs } =
    useTrayFocusManager(dismissKeyboard);
  const prepareKeyboardHandoff = useCallback(() => {
    // Keep a native first responder alive while the outgoing input subtree is
    // replaced. The next TrayTextInput can immediately take focus without
    // allowing iOS to begin a keyboard dismissal animation in between.
    keyboardHandoffRef.current?.focus();
  }, []);
  const runtime = useTrayRuntime({
    keyboardHeight,
    anticipateKeyboard,
    prepareKeyboardHandoff,
    dismissFocusedInputs,
    registerFocusable,
  });
  const backgroundScale = useSharedValue(1);
  const backgroundStyle = useAnimatedStyle(() => ({
    // fullscreen steps scale app content behind the tray through this provider value
    transform: [{ scale: backgroundScale.value }],
  }));

  return (
    <KeyboardProvider>
      <TrayStoreProvider value={runtime}>
        <TrayBackgroundScaleProvider value={backgroundScale}>
          <TextInput
            ref={keyboardHandoffRef}
            accessible={false}
            pointerEvents="none"
            caretHidden
            contextMenuHidden
            defaultValue=""
            style={styles.keyboardHandoff}
          />
          <Animated.View style={[styles.background, backgroundStyle]}>
            {children}
          </Animated.View>

          {/* presenter stays outside the scaled background so trays keep exact geometry */}
          <TrayPresenter renderHost={PresentedActionTray} />
        </TrayBackgroundScaleProvider>
      </TrayStoreProvider>
    </KeyboardProvider>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardHandoff: {
    position: "absolute",
    left: -8,
    top: -8,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
