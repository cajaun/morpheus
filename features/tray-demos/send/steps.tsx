import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow, useTrayPages } from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoText } from "@/shared/theme/tokens";
import { ActionRow, SendFlowFooter, SendFlowHeader } from "./components";
import type { SendAction } from "./types";

export const SendEntryStep = ({
  onSelectAction,
}: {
  onSelectAction: (action: SendAction) => void;
}) => {
  const { next } = useTrayFlow();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <Tray.Section style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
        <View className="gap-3">
          <ActionRow
            icon="paperplane.fill"
            iconBackgroundColor="#358EFF"
            label="Send"
            description="Send tokens or collectibles to any address or ENS username."
            onPress={() => {
              onSelectAction("send");
              next();
            }}
          />

          <ActionRow
            icon="arrow.trianglehead.2.clockwise.rotate.90"
            iconBackgroundColor="#747483"
            label="Swap"
            description="Swap your tokens without ever leaving your wallet."
            onPress={() => {
              onSelectAction("swap");
              next();
            }}
          />

          <ActionRow
            icon="arrow.down"
            iconBackgroundColor="#4BCF6C"
            label="Receive"
            description="Receive Ethereum based assets through your unique address."
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const SendDestinationPage = () => {
  const { nextPage } = useTrayPages();
  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <View className="gap-6">
          <View className="flex-row items-center bg-[#141414] rounded-2xl px-4 py-2">
            <Text
              className="text-[#6B6F76] flex-1 font-sf-medium"
              style={trayDemoText.bodyLarge}
            >
              To ENS or Address
            </Text>

            <PressableScale
              className="bg-[#2B2B2B] px-4 py-1 rounded-full"
              onPress={nextPage}
            >
              <Text
                className="text-white font-sf-medium"
                style={trayDemoText.bodyLarge}
              >
                Paste
              </Text>
            </PressableScale>
          </View>

          <PressableScale className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-[#111111] items-center justify-center">
              <SymbolView name="qrcode.viewfinder" tintColor="#9CA3AF" />
            </View>

            <View>
              <Text
                className="text-white font-sf-medium"
                style={trayDemoText.bodyLarge}
              >
                Scan QR Code
              </Text>
              <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
                Tap to scan an address
              </Text>
            </View>
          </PressableScale>

          <View className="gap-6">
            <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
              Your Wallets
            </Text>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-xl">😁</Text>
              </View>

              <View>
                <Text
                  className="text-white font-sf-medium"
                  style={trayDemoText.bodyLarge}
                >
                  Test
                </Text>
                <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-[#1F2937]" />

              <View>
                <Text
                  className="text-white font-sf-medium"
                  style={trayDemoText.bodyLarge}
                >
                  valmiera
                </Text>
                <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>
          </View>

          <View className="gap-6">
            <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
              Watched Wallets
            </Text>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-[#134E4A] items-center justify-center">
                <View className="w-6 h-6 bg-yellow-400 rounded-sm" />
              </View>

              <View>
                <Text
                  className="text-white font-sf-medium"
                  style={trayDemoText.bodyLarge}
                >
                  valmiera.eth
                </Text>
                <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const SendAmountPage = () => {
  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Text
              className="text-[#6B6F76] font-sf-medium"
              style={{
                fontSize: 18,
                lineHeight: 26,
                letterSpacing: 0.15,
              }}
            >
              This page exists so you can test the fullscreen slide flow from
              one page to the next.
            </Text>
          </View>

          <View
            style={{
              borderRadius: 32,
              backgroundColor: "#141414",
              paddingHorizontal: 20,
              paddingVertical: 24,
              gap: 8,
            }}
          >
            <Text
              className="text-[#6B6F76] font-sf-medium"
              style={{
                fontSize: 16,
                lineHeight: 22,
                letterSpacing: 0.12,
              }}
            >
              Amount
            </Text>

            <Text
              className="text-white font-sf-bold"
              style={{
                fontSize: 40,
                lineHeight: 46,
                letterSpacing: 0.2,
              }}
            >
              0.00 ETH
            </Text>

            <Text className="text-[#6B6F76] font-sf-medium" style={trayDemoText.body}>
              Choose an amount to continue your send flow.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {["25%", "50%", "Max"].map((label) => (
              <PressableScale
                key={label}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  backgroundColor: "#141414",
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  className="text-white font-sf-semibold"
                  style={{
                    fontSize: 18,
                    lineHeight: 24,
                    letterSpacing: 0.15,
                  }}
                >
                  {label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const SendReviewPage = () => {
  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <Text className="font-sf-medium text-white" style={trayDemoText.bodyLarge}>
          Review your transfer
        </Text>

        <Text
          className="text-[#94999F] font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
          Lorem ipsum dolor amet. Lorem ipsum dolor amet.
        </Text>

        <Text
          className="text-[#94999F] font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Temporibus,
          laboriosam deserunt in fuga eos quas fugit quo unde hic sit sapiente
          sunt ratione reprehenderit similique placeat ex.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

export const SendFlowStep = ({ selectedAction }: { selectedAction: SendAction }) => {
  return (
    <Tray.Pages>
      <Tray.Pages.Header>
        <SendFlowHeader action={selectedAction} />
      </Tray.Pages.Header>

      <Tray.Page className="flex-1">
        <SendDestinationPage />
      </Tray.Page>

      <Tray.Page className="flex-1">
        <SendAmountPage />
      </Tray.Page>

      <Tray.Page className="flex-1">
        <SendReviewPage />
      </Tray.Page>

      <Tray.Pages.Footer>
        <SendFlowFooter />
      </Tray.Pages.Footer>
    </Tray.Pages>
  );
};
