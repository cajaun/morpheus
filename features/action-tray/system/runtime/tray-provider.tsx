import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useActionTrayKeyboard } from "../core/input/use-action-tray-keyboard";
import { TrayBackgroundScaleProvider } from "./tray-background-scale";
import { TrayStoreProvider } from "./tray-context";
import { TrayPresenter } from "./tray-presenter";
import { useTrayFocusManager } from "./use-tray-focus-manager";
import { useTrayRuntime } from "./use-tray-runtime";

// provider is the integration boundary between ambient app state and tray runtime
export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { keyboardHeight, dismissKeyboard, anticipateKeyboard } =
    useActionTrayKeyboard();
  const { registerFocusable, dismissFocusedInputs } =
    useTrayFocusManager(dismissKeyboard);
  const runtime = useTrayRuntime({
    keyboardHeight,
    anticipateKeyboard,
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
        <Animated.View style={[styles.background, backgroundStyle]}>
          {children}
        </Animated.View>

        {/* presenter stays outside the scaled background so trays keep exact geometry */}
        <TrayPresenter />
      </TrayBackgroundScaleProvider>
    </TrayStoreProvider>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
