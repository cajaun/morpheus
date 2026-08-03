import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Laminar } from "react-native-laminar";
import { Tray, useTrayFlow, type TrayStepDefinition } from "morpheus";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
} from "morpheus/constants";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayDemoTheme } from "../theme";

const TRANSFER_BUTTON_WIDTH =
  SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

const TransferButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) => (
  <PressableScale
    onPress={onPress}
    style={{
      alignItems: "center",
      backgroundColor: "#9896FF",
      borderRadius: 50,
      height: 50,
      justifyContent: "center",
      width: "100%",
    }}
  >
    <Text className="text-white font-sf-bold" style={trayDemoText.button}>
      {label}
    </Text>
  </PressableScale>
);

const OptionCheckbox = ({ checked }: { checked: boolean }) => (
  <View
    style={{
      alignItems: "center",
      borderColor: checked ? "#FFFFFF" : "#666668",
      borderRadius: 6,
      borderWidth: 3,
      height: 32,
      justifyContent: "center",
      width: 32,
    }}
  >
    {checked ? (
      <Text style={{ color: "#FFFFFF", fontSize: 22, lineHeight: 24 }}>✓</Text>
    ) : null}
  </View>
);

const TransferOptionsStep = () => {
  const { close, index } = useTrayFlow();
  const [selected, setSelected] = useState<number[]>([]);
  const options = [
    "Point the ENS name to the recipient’s wallet address",
    "Clear all profile information associated with the ENS name",
    "Transfer full control of the ENS name to the recipient",
  ];

  const toggleOption = (option: number) => {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Transfer Options"
          shouldClose
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 28 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#F5F5FA",
            borderRadius: 17,
            flexDirection: "row",
            gap: 14,
            minHeight: 50,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: "#6E9BFF",
              borderRadius: 6,
              height: 22,
              justifyContent: "center",
              width: 22,
            }}
          >
            <SymbolView name="link" size={15} tintColor="#FFFFFF" />
          </View>
          <Text
            style={{
              color: "#1A1A1A",
              flex: 1,
              fontFamily: "Sf-semibold",
              fontSize: 18,
            }}
          >
            ENS Configuration
          </Text>
          <SymbolView name="info.circle" size={24} tintColor="#949595" />
        </View>

        <View style={{ gap: 26 }}>
          {options.map((label, index) => (
            <Pressable
              key={label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected.includes(index) }}
              onPress={() => toggleOption(index)}
              style={{
                alignItems: "flex-start",
                flexDirection: "row",
                gap: 24,
              }}
            >
              <OptionCheckbox checked={selected.includes(index)} />
              <Text
                style={{
                  color: "#1A1A1A",
                  flex: 1,
                  fontFamily: "Sf-semibold",
                  fontSize: 18,
                  lineHeight: 26,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const TransferOptionsFooter = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <View style={{ width: TRANSFER_BUTTON_WIDTH }}>
        <PressableScale
          onPress={close}
          style={{
            alignItems: "center",
            backgroundColor: "#9896FF",
            borderRadius: 50,
            height: 50,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", gap: 5 }}>
            <Laminar
              text="Confirm"
              autoSize={false}
              align="center"
              animationPreset="default"
              clipToBounds={false}
              style={{
                color: "#FFFFFF",
                fontFamily: "Sf-bold",
                textAlign: "center",
              }}
              className="text-2xl"
            />
          </View>
        </PressableScale>
      </View>
    </Tray.Footer>
  );
};

const TransferOptionsTrigger = () => (
  <Tray.Trigger haptics="feedback">
    <View style={{ width: TRANSFER_BUTTON_WIDTH }}>
      <TransferButton label="Continue" />
    </View>
  </Tray.Trigger>
);

type ExpandFromTriggerDemoProps = { showBackLink?: boolean };

const ExpandFromTriggerDemo = ({
  showBackLink = true,
}: ExpandFromTriggerDemoProps) => {
  const { bottom } = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const steps: TrayStepDefinition[] = [
    {
      key: "transfer-options",
      content: <TransferOptionsStep />,
      options: {
        className: "bg-white",
        footerStyle: { backgroundColor: trayDemoColors.white },
      },
    },
  ];

  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      {showBackLink ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 64 }}>
          <Link
            href="/"
            style={{
              color: theme.muted,
              fontFamily: "Sf-semibold",
              fontSize: 16,
            }}
          >
            Back
          </Link>
        </View>
      ) : null}

      <View
        style={{
          alignItems: "center",
          flex: 1,
          paddingTop: showBackLink ? 72 : 136,
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
          Transfer Options
        </Text>
      </View>

      <Tray.Root
        steps={steps}
        footer={<TransferOptionsFooter />}
        transition={{ open: "expandFromTrigger", close: "collapseToTrigger" }}
      >
        <View
          style={{
            alignItems: "center",
            bottom: bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
            left: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
            position: "absolute",
            right: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
          }}
        >
          <TransferOptionsTrigger />
        </View>
      </Tray.Root>
    </View>
  );
};

export default ExpandFromTriggerDemo;
