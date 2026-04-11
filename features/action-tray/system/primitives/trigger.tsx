import React from "react";
import { Pressable, PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import {
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";
import { markTrayTriggerPressed } from "../telemetry/tray-open-timing";

const IMPACT_HAPTICS = {
  "impact-light": Haptics.ImpactFeedbackStyle.Light,
  "impact-medium": Haptics.ImpactFeedbackStyle.Medium,
  "impact-heavy": Haptics.ImpactFeedbackStyle.Heavy,
  "impact-soft": Haptics.ImpactFeedbackStyle.Soft,
  "impact-rigid": Haptics.ImpactFeedbackStyle.Rigid,
} as const;

const NOTIFICATION_HAPTICS = {
  "notification-success": Haptics.NotificationFeedbackType.Success,
  "notification-warning": Haptics.NotificationFeedbackType.Warning,
  "notification-error": Haptics.NotificationFeedbackType.Error,
} as const;

// trigger is the intent boundary where haptics telemetry and open state begin
type TrayTriggerImpactHaptics = keyof typeof IMPACT_HAPTICS;
type TrayTriggerNotificationHaptics = keyof typeof NOTIFICATION_HAPTICS;

export type TrayTriggerHaptics =
  | false
  | "feedback"
  | "selection"
  | TrayTriggerImpactHaptics
  | TrayTriggerNotificationHaptics
  | {
      type: "selection";
    }
  | {
      type: "impact";
      style?: Haptics.ImpactFeedbackStyle;
    }
  | {
      type: "notification";
      style?: Haptics.NotificationFeedbackType;
    };

export type TrayTriggerProps = PressableProps & {
  children: React.ReactNode;
  haptics?: TrayTriggerHaptics;
};

const fireTriggerHaptics = (haptics: TrayTriggerHaptics) => {
  // object syntax exposes the native enum without leaking that shape to every caller
  if (typeof haptics === "object") {
    switch (haptics.type) {
      case "selection":
        void Haptics.selectionAsync();
        return;
      case "impact":
        void Haptics.impactAsync(
          haptics.style ?? Haptics.ImpactFeedbackStyle.Light,
        );
        return;
      case "notification":
        void Haptics.notificationAsync(
          haptics.style ?? Haptics.NotificationFeedbackType.Success,
        );
        return;
    }
  }

  // string presets cover common feedback without forcing enum imports into screens
  if (typeof haptics === "string") {
    if (haptics in IMPACT_HAPTICS) {
      void Haptics.impactAsync(
        IMPACT_HAPTICS[haptics as TrayTriggerImpactHaptics],
      );
      return;
    }

    if (haptics in NOTIFICATION_HAPTICS) {
      void Haptics.notificationAsync(
        NOTIFICATION_HAPTICS[haptics as TrayTriggerNotificationHaptics],
      );
      return;
    }
  }

  switch (haptics) {
    case false:
      return;
    case "selection":
      void Haptics.selectionAsync();
      return;
    case "feedback":
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export const TrayTrigger: React.FC<TrayTriggerProps> = ({
  children,
  onPress,
  haptics = "feedback",
  ...rest
}) => {
  const trayId = useTrayScope();
  const { openTray } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Tray.Trigger must be used within Tray.Root");
  }

  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        // telemetry and feedback belong to the press edge not the resulting open state
        markTrayTriggerPressed(trayId);
        fireTriggerHaptics(haptics);
        onPress?.(event);
        openTray(trayId);
      }}
    >
      {children}
    </Pressable>
  );
};

TrayTrigger.displayName = "TrayTrigger";
