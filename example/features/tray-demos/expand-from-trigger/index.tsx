import { Text, View } from "react-native";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
} from "react-native-morpheus/constants";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayDemoTheme } from "../theme";

const BACKUP_BUTTON_WIDTH =
  SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;

const BACKUP_PURPLE = "#A653F5";
const BACKUP_MUTED_TEXT = "#9FA1A8";

const BackupTriggerButton = ({
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
      backgroundColor: BACKUP_PURPLE,
      borderRadius: 50,
      height: 50,
      justifyContent: "center",
      width: "100%",
    }}
  >
    <Text className="text-white font-bold" style={trayDemoText.Button}>
      {label}
    </Text>
  </PressableScale>
);

const BackupInfoStep = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 28,
          paddingTop: 24,
        }}
      >
        <View
          style={{
            alignItems: "flex-start",
            height: 68,
            justifyContent: "center",
            width: 68,
          }}
        >
          <SymbolView name="checkmark.icloud" size={64} tintColor="#9B9C9F" weight="thin" />
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <PressableScale
            onPress={close}
            style={{
              alignItems: "center",
              backgroundColor: "#F5F5F8",
              borderRadius: 999,
              height: 36,
              justifyContent: "center",
              width: 36,
            }}
          >
            <SymbolView
              name="xmark"
              size={18}
              weight="bold"
              tintColor="#96979A"
            />
          </PressableScale>
        </View>
      </View>

      <Tray.Section
        style={{
          gap: 12,
          paddingHorizontal: 28,
        }}
      >
        <Text
          className="font-semibold"
          style={{
            color: "#25272D",
            fontSize: 28,
            letterSpacing: 0.1,
            lineHeight: 31,
          }}
        >
          An existing iCloud{"\n"}Backup is available
        </Text>

        <View style={{ gap: 12 }}>
          <Text
            className="font-medium"
            style={{
              color: BACKUP_MUTED_TEXT,
              fontSize: 20,
              letterSpacing: 0.1,
              lineHeight: 28,
            }}
          >
            You’ve already enabled iCloud Backup for at least one of your other
            wallets.
          </Text>

          <Text
            className="font-medium"
            style={{
              color: BACKUP_MUTED_TEXT,
              letterSpacing: 0.1,
              fontSize: 20,
              lineHeight: 28,
            }}
          >
            On the next step, simply enter your existing password to add your
            new wallet to your current iCloud Backup.
          </Text>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const BackupInfoFooter = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <View style={{ width: "100%" }}>
        <PressableScale
          onPress={close}
          style={{
            alignItems: "center",
            backgroundColor: BACKUP_PURPLE,
            borderRadius: 50,
            height: 50,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Text className="text-white font-bold" style={trayDemoText.Button}>
            Continue
          </Text>
        </PressableScale>
      </View>
    </Tray.Footer>
  );
};

const BackupInfoTrigger = () => (
  <Tray.Trigger haptics="feedback">
    <View style={{ width: BACKUP_BUTTON_WIDTH }}>
      <BackupTriggerButton label="Continue" />
    </View>
  </Tray.Trigger>
);

type ExpandFromTriggerDemoProps = { showBackLink?: boolean };

const ExpandFromTriggerDemo = ({
  showBackLink = true,
}: ExpandFromTriggerDemoProps) => {
  const { bottom } = useSafeAreaInsets();
  const theme = useTrayDemoTheme();

  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <Tray.Root
        stepOptions={{
          className: "bg-white",
          footerStyle: { backgroundColor: trayDemoColors.white },
        }}
        footer={<BackupInfoFooter />}
        transition={{ open: "expandFromTrigger", close: "collapseToTrigger" }}
      >
        <Tray.Step>
          <BackupInfoStep />
        </Tray.Step>
        <View
          style={{
            alignItems: "center",
            bottom: bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
            left: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
            position: "absolute",
            right: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
          }}
        >
          <BackupInfoTrigger />
        </View>
      </Tray.Root>
    </View>
  );
};

export default ExpandFromTriggerDemo;
