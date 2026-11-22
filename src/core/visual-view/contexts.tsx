import React, { useMemo } from "react";
import Animated from "react-native-reanimated";
import { createTrayLayoutTransition } from "../animation/tray-layout";
import {
  type TrayKeyboardGate,
  type TrayTransitionStart,
} from "../transition-start";
import { resolveTrayContentMotionDirection } from "../transition-motion-direction";
import { useTrayGesture } from "../input/use-tray-gesture";

export type TrayFooterInteraction = {
  interactive: boolean;
  isSurfaceReady: boolean;
};

export type TrayBackdropInteraction = {
  interactive: boolean;
  onRequestClose: () => void;
};

export const TrayGestureContext = React.createContext<
  ReturnType<typeof useTrayGesture> | undefined
>(undefined);

export const TrayFooterInteractionContext = React.createContext<
  TrayFooterInteraction | undefined
>(undefined);

export const TrayBackdropInteractionContext = React.createContext<
  TrayBackdropInteraction | undefined
>(undefined);

export const TrayKeyboardStickyContext = React.createContext(false);

// present under a keyboard-capable tray, the sheet layout waits on it for keyboard steps
export const TrayKeyboardGateContext =
  React.createContext<TrayKeyboardGate | null>(null);

// per-step transition values reach the few leaves that read them through context, so memoized surfaces in between skip with timing unchanged
export type TrayShellTransitionValue = {
  contentMotionDirection: ReturnType<typeof resolveTrayContentMotionDirection>;
  trayTransitionStart: TrayTransitionStart;
  layoutAnimationConfig: ReturnType<typeof createTrayLayoutTransition>;
};

export const TrayShellTransitionContext =
  React.createContext<TrayShellTransitionValue | null>(null);

// sheet-only frame values, the height lock and the step's sheet class, delivered past the memoized surface
export type TraySheetFrameValue = {
  presentationFrameStyle: React.ComponentProps<typeof Animated.View>["style"];
  renderedClassName?: string;
};

export const TraySheetFrameContext =
  React.createContext<TraySheetFrameValue | null>(null);

export const TraySheetFrameProvider = ({
  presentationFrameStyle,
  renderedClassName,
  children,
}: TraySheetFrameValue & { children: React.ReactNode }) => {
  const value = useMemo(
    () => ({ presentationFrameStyle, renderedClassName }),
    [presentationFrameStyle, renderedClassName],
  );

  return (
    <TraySheetFrameContext.Provider value={value}>
      {children}
    </TraySheetFrameContext.Provider>
  );
};

// the sheet view reads the layout config and flag from context so a change re-renders that view alone
export const TraySheetLayoutAnimationContext = React.createContext(false);
