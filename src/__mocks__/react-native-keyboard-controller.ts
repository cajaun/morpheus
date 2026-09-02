import React from "react";
import { useSharedValue } from "react-native-reanimated";

// keep native keyboard-controller imports deterministic in the unit-test runtime
export const KeyboardProvider = ({ children }: { children: React.ReactNode }) =>
  children;

export const KeyboardStickyView = ({
  children,
}: {
  children: React.ReactNode;
}) => children;

export const KeyboardController = {
  dismiss: () => Promise.resolve(),
};

export const useKeyboardState = <T>(
  selector: (state: { isVisible: boolean }) => T,
) => selector({ isVisible: false });

export const useReanimatedKeyboardAnimation = () => ({
  height: useSharedValue(0),
  progress: useSharedValue(0),
});

export const useKeyboardHandler = () => {};
