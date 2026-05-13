import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayOriginProgress,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
} from "@/features/action-tray/system/core/constants";
import { AnimatedFlowButton } from "@/features/action-tray/presets/animated-flow-button";
import { trayDemoColors } from "@/shared/theme/tokens";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayDemoTheme } from "../theme";

const WARNING_RED = "#FF1F45";
const MUTED_TEXT = "#9FA1A8";
const SECONDARY_ACTION = "#F3F4F6";
const WARNING_BUTTON_WIDTH =
  SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

const WarningStep = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header style={{ gap: 0 }}>
        <View style={{ alignItems: "flex-end" }}>
          <PressableScale
            onPress={() => close()}
            style={{
              height: 32,
              width: 32,
              borderRadius: 999,
              backgroundColor: "#F4F4F7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView
              name="xmark"
              tintColor="#8F9095"
              size={18}
              weight="bold"
            />
          </PressableScale>
        </View>
      </Tray.Header>

      <Tray.Section style={{ gap: 20, paddingVertical: 0, paddingBottom: 24 }}>
        <View
          style={{
            alignItems: "center",
            borderColor: "#FF4353",
            borderRadius: 24,
            borderWidth: 3,
            height: 48,
            justifyContent: "center",
            width: 48,
          }}
        >
          <Text
            className="font-sf-bold"
            style={{
              color: "#FF4353",
              fontSize: 31,
              lineHeight: 34,
            }}
          >
            !
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text
            className="font-sf-bold"
            style={{
              color: "#25272D",
              fontSize: 25,
              lineHeight: 31,
              letterSpacing: 0.1,
            }}
          >
            Are you sure?
          </Text>

          <Text
            className="font-sf-medium"
            style={{
              color: MUTED_TEXT,
              fontSize: 20,
              lineHeight: 28,
              letterSpacing: 0.1,
            }}
          >
            You haven't backed up your wallet yet. If you remove it, you could
            lose access forever. We suggest tapping Cancel and backing up your
            wallet first with a valid recovery method.
          </Text>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const WarningFooter = () => {
  const { close } = useTrayFlow();
  const originProgress = useTrayOriginProgress();

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <AnimatedFlowButton
        step={1}
        totalSteps={3}
        layout={{ width: WARNING_BUTTON_WIDTH }}
        animation={{ splitProgress: originProgress }}
        primaryAction={{
          backgroundColor: WARNING_RED,
          onPress: close,
        }}
        secondaryAction={{
          backgroundColor: SECONDARY_ACTION,
          onPress: close,
          visible: true,
        }}
      />
    </Tray.Footer>
  );
};

const WarningTrigger = () => (
  <Tray.Trigger haptics="feedback">

      <AnimatedFlowButton
        step={0}
        totalSteps={2}
        layout={{ width: WARNING_BUTTON_WIDTH }}
        primaryAction={{
          backgroundColor: WARNING_RED,
        }}
     
      />
 
  </Tray.Trigger>
);

const RemoveWalletWarningTray = () => {
  const { bottom } = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "remove-wallet-warning",
        content: <WarningStep />,
        options: {
          className: "bg-white",
          footerStyle: { backgroundColor: trayDemoColors.white },
        },
      },
    ],
    [],
  );

  const footer = useMemo(() => <WarningFooter />, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingTop: 136,
        }}
      >
        <Text
          className="font-sf-semiBold"
          style={{
            color: theme.muted,
            fontSize: 22,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          Remove Wallet
        </Text>
      </View>

      <Tray.Root
        steps={steps}
        footer={footer}
        transition={{
          open: "expandFromTrigger",
          close: "collapseToTrigger",
        }}
      >
        <View
          style={{
            bottom: bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
            alignItems: "center",
            left: 28,
            position: "absolute",
            right: 28,
          }}
        >
          <WarningTrigger />
        </View>
      </Tray.Root>
    </View>
  );
};

export default RemoveWalletWarningTray;
