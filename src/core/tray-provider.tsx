import React, { useCallback, useRef } from "react";
import { StyleSheet, TextInput } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useTrayKeyboard } from "./input/use-tray-keyboard";
import { PresentedTray } from "./presenter/presented-tray";
import { TrayBackgroundScaleProvider } from "../runtime/tray-background-scale";
import { TrayStoreProvider } from "../runtime/tray-context";
import { TrayPresenter } from "../runtime/tray-presenter";
import { useTrayFocusManager } from "../runtime/use-tray-focus-manager";
import { useTrayRuntime } from "../runtime/use-tray-runtime";

// KeyboardProvider is owned by the application root (see README setup). Keep
// this provider focused on tray state so every keyboard consumer shares one
// native context and one animation clock.
export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const keyboardHandoffRef = useRef<TextInput>(null);
  const { dismissKeyboard, anticipateKeyboard } = useTrayKeyboard();
  const { registerFocusable, dismissFocusedInputs } =
    useTrayFocusManager(dismissKeyboard);
  const prepareKeyboardHandoff = useCallback(() => {
    // Keep a native first responder alive while the outgoing input subtree is
    // replaced. The next TrayTextInput can immediately take focus without
    // allowing iOS to begin a keyboard dismissal animation in between.
    keyboardHandoffRef.current?.focus();
  }, []);
  const runtime = useTrayRuntime({
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
        <TrayPresenter renderHost={PresentedTray} />
      </TrayBackgroundScaleProvider>
    </TrayStoreProvider>
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
