import React from "react";
import { StyleSheet } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { PresentedActionTray } from "./presenter/presented-action-tray";
import { TrayBackgroundScaleProvider } from "../runtime/tray-background-scale";
import { TrayStoreProvider } from "../runtime/tray-context";
import { TrayPresenter } from "../runtime/tray-presenter";
import { useTrayRuntime } from "../runtime/use-tray-runtime";

// integration boundary between runtime state and the native animated renderer
export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const runtime = useTrayRuntime();
  const backgroundScale = useSharedValue(1);
  const backgroundStyle = useAnimatedStyle(() => ({
    // fullscreen steps scale app content behind the tray through this provider value
    transform: [{ scale: backgroundScale.value }],
  }));

  return (
    <KeyboardProvider>
      <TrayStoreProvider value={runtime}>
        <TrayBackgroundScaleProvider value={backgroundScale}>
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
});
