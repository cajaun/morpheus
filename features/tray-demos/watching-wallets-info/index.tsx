import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";

const WatchingWalletsInfoStep = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <Tray.Section style={{ gap: 20, paddingHorizontal: 0, paddingVertical: 0 }}>
        <View
          style={{
            borderRadius: 34,
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View
            style={{
              backgroundColor: "#62778A",
              minHeight: 200,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 24,
              justifyContent: "flex-end",
            }}
          >
            <PressableScale
              onPress={close}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.22)",
              }}
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={17}
                weight="bold"
                tintColor="#FFFFFF"
              />
            </PressableScale>

            <View style={{ position: "absolute", top: 18, left: 24 }}>
              <SymbolView
                name="binoculars.fill"
                tintColor="#8192A2"
                size={125}
                weight="regular"
              />
            </View>

            <View style={{ gap: 2 }}>
              <Text
                className="font-sfSemibold text-white"
                style={{
                  fontSize: 28,
                  lineHeight: 34,
                  letterSpacing: 0.3,
                }}
              >
                Watching Wallets
              </Text>

              <Text
                className="font-sfMedium text-[#E7EDF3]"
                style={{
                  fontSize: 18,
                  lineHeight: 24,
                  letterSpacing: 0.2,
                }}
              >
                Learn about watching wallets
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 28,
              paddingTop: 24,
              paddingBottom: 12,
            }}
          >
            <Text
              className="font-sfMedium text-[#9CA0A7]"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Watching a wallet allows you to monitor public activity and balance
              changes on a specific Ethereum address. This can be useful for
              keeping track of transactions, assets, and events associated with a
              particular address, such as a friend's wallet or smart contract. It
              can also be helpful for tracking wallets you own but haven't yet
              imported fully into Family.
            </Text>
          </View>
        </View>

        <View style={{ paddingBottom: 28, paddingHorizontal: 24, width: "100%" }}>
          <PrimaryButton label="Got It" onPress={close} backgroundColor="#62778A" />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const WatchingWalletsInfoTray = () => {
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "watching-wallets-info",
        content: <WatchingWalletsInfoStep />,
        options: { className: "bg-white" },
      },
    ],
    [],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger>
        <ExampleTrigger label="Watching Wallets" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default WatchingWalletsInfoTray;
