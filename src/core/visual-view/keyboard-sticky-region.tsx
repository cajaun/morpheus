import React, { useMemo } from "react";
import { Animated as RNAnimated, View } from "react-native";
import { useKeyboardAnimation } from "react-native-keyboard-controller";
import { ABSOLUTE_FILL, TRAY_KEYBOARD_GAP } from "../constants";
import { TrayKeyboardStickyContext } from "./contexts";

export const TrayKeyboardStickyAnimatedRegion = React.memo(
  ({ enabled, children }: { enabled: boolean; children: React.ReactNode }) => {
    const keyboardStickyEnabled = React.useContext(TrayKeyboardStickyContext);
    const { height, progress } = useKeyboardAnimation();
    const isEnabled = enabled && keyboardStickyEnabled;

    // KeyboardStickyView rebuilds this interpolation per render, so keep one native graph while the source is stable
    const keyboardOffset = useMemo(
      () =>
        progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, TRAY_KEYBOARD_GAP],
        }),
      [progress],
    );
    const stickyStyle = useMemo(() => {
      const disabledOffset = RNAnimated.add(RNAnimated.multiply(height, 0), 0);
      const enabledOffset = RNAnimated.add(height, keyboardOffset);

      return {
        transform: [{ translateY: isEnabled ? enabledOffset : disabledOffset }],
      };
    }, [height, isEnabled, keyboardOffset]);
    const styles = useMemo(() => [stickyStyle, ABSOLUTE_FILL], [stickyStyle]);

    return (
      <RNAnimated.View pointerEvents="box-none" style={styles}>
        {children}
      </RNAnimated.View>
    );
  },
);

TrayKeyboardStickyAnimatedRegion.displayName =
  "TrayKeyboardStickyAnimatedRegion";

export const TrayKeyboardStickyRegion = React.memo(
  ({
    capable,
    enabled,
    children,
  }: {
    capable: boolean;
    enabled: boolean;
    children: React.ReactNode;
  }) =>
    // no step moves with the keyboard, so keep the fill geometry without the keyboard clock
    capable ? (
      <TrayKeyboardStickyAnimatedRegion enabled={enabled}>
        {children}
      </TrayKeyboardStickyAnimatedRegion>
    ) : (
      <View pointerEvents="box-none" style={ABSOLUTE_FILL}>
        {children}
      </View>
    ),
);

TrayKeyboardStickyRegion.displayName = "TrayKeyboardStickyRegion";
