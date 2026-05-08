import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import { EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET } from "@/features/action-tray/system/core/constants";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoRadius,
  trayDemoText,
} from "@/shared/theme/tokens";
import { FieldShell } from "../shared/field-shell";
import { trayTextInputStyle } from "../shared/input-styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayDemoTheme } from "../theme";

const AddContactButtonVisual = () => (
  <View
    style={{
      alignItems: "center",
      backgroundColor: trayDemoColors.primaryAction,
      borderCurve: "continuous",
      borderRadius: trayDemoRadius.button,
      height: 50,
      justifyContent: "center",
      width: "100%",
    }}
  >
    <Text className="font-sf-semibold text-white" style={trayDemoText.button}>
      Add Contact
    </Text>
  </View>
);

const AddAddressStep = () => {
  const { close, index } = useTrayFlow();
  const [address, setAddress] = useState("");

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Add Address"
          shouldClose
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 20 }}>
        <FieldShell>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <SymbolView
              name="magnifyingglass"
              type="palette"
              size={20}
           
              tintColor="#94999F"
            />

            <Tray.TextInput
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              clearButtonMode="while-editing"
              keyboardType="ascii-capable"
              placeholder="ENS or Address"
              placeholderTextColor={trayDemoColors.secondaryText}
              returnKeyType="done"
              smartInsertDelete={false}
              spellCheck={false}
              textContentType="none"
              style={{ ...trayTextInputStyle, }}
            />

       
          </View>
        </FieldShell>

        <View
          style={{
            minHeight: 190,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingHorizontal: 16,
          }}
        >
          <SymbolView
            name="person.fill"
            tintColor="#D6DAE0"
            size={65}
            weight="regular"
          />

          <Text
            className="font-sf-medium text-center text-[#B6BAC2]"
            style={{
              fontSize: 20,
              lineHeight: 28,
              letterSpacing: 0.2,
            }}
          >
            Search or paste an address{"\n"}to add as a contact
          </Text>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const ExpandFooter = () => {
  const { close } = useTrayFlow();

  const handlePress = async () => {
    await Haptics.selectionAsync();
    close();
  };

  return (
    <Tray.Footer className = "rounded-full" style={{ width: "100%", backgroundColor: "white", }}>
      <PressableScale onPress={handlePress} style={{ width: "100%" }}>
        <AddContactButtonVisual />
      </PressableScale>
    </Tray.Footer>
  );
};

type ExpandFromTriggerDemoProps = {
  showBackLink?: boolean;
};

const ExpandFromTriggerDemo = ({
  showBackLink = true,
}: ExpandFromTriggerDemoProps) => {
  const { bottom } = useSafeAreaInsets();
  const theme = useTrayDemoTheme();
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "add-address",
        content: <AddAddressStep />,
        options: {
          className: "bg-white",
          footerStyle: { backgroundColor: trayDemoColors.white },
        },
      },
    ],
    [],
  );

  const footer = useMemo(() => <ExpandFooter />, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
          flex: 1,
          alignItems: "center",
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
          Choose Wallet Group
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
            left: 28,
            position: "absolute",
            right: 28,
          }}
        >
          <Tray.Trigger haptics="feedback" style={{ width: "100%" }}>
            <AddContactButtonVisual />
          </Tray.Trigger>
        </View>
      </Tray.Root>
    </View>
  );
};

export default ExpandFromTriggerDemo;
