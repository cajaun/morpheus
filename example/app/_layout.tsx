import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { TrayProvider } from "react-native-morpheus";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <TrayProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="demos" options={{ headerShown: false }} />
            <Stack.Screen
              name="expand-from-trigger"
              options={{ headerShown: false }}
            />
          </Stack>
        </TrayProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
