import React from "react";
import { StyleSheet } from "react-native";
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
        <TrayPresenter renderHost={PresentedActionTray} />
      </TrayBackgroundScaleProvider>
    </TrayStoreProvider>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
