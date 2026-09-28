import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const PURPLE = "#9896F8";

const NotificationsHeader = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow>
        <Text className="font-semibold text-black" style={trayDemoText.Title1}>
          Notifications
        </Text>

        <Tray.HeaderCloseButton onPress={close}>
          <SymbolView
            name="xmark"
            type="palette"
            tintColor="#787878"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            weight="bold"
          />
        </Tray.HeaderCloseButton>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const NotificationsBody = () => {
  const { close } = useTrayFlow();
  const [enabled, setEnabled] = useState(true);

  return (
    <Tray.Body>
      <Tray.Section withAction>
        <View
          className="flex-row items-center justify-between rounded-3xl"
          style={styles.notificationRow}
        >
          <Text
            className="font-semibold text-black"
            style={trayDemoText.Title2}
          >
            Allow Notifications
          </Text>
          <View style={styles.switchSlot}>
            <Switch
              accessibilityLabel="Allow Notifications"
              ios_backgroundColor="#D1D1D6"
              onValueChange={setEnabled}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#D1D1D6", true: PURPLE }}
              value={enabled}
            />
          </View>
        </View>

        <Tray.PrimaryButton onPress={close} style={{ backgroundColor: PURPLE }}>
          <Text
            className="font-semibold text-white"
            style={trayDemoText.Button}
          >
            Done
          </Text>
        </Tray.PrimaryButton>
      </Tray.Section>
    </Tray.Body>
  );
};

const NotificationsTray = () => (
  <Tray.Root
    stepOptions={{
      className: "bg-white",
      footerStyle: { backgroundColor: "#FFFFFF" },
    }}
  >
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Notifications" />
    </Tray.Trigger>

    <Tray.Step>
      <NotificationsHeader />
      <NotificationsBody />
    </Tray.Step>
  </Tray.Root>
);

const styles = {
  notificationRow: {
    backgroundColor: "#F7F7F7",
    height: 64,
    paddingHorizontal: 16,
  },
  switchSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
} as const;

export default NotificationsTray;
