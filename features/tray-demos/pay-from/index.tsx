import React, { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";

const wallets = [
  {
    id: "1",
    name: "valmiera",
    address: "0x0862•••9777",
    avatar: "https://i.pravatar.cc/100?img=1",
  },
  {
    id: "2",
    name: "Test",
    address: "0x35c5•••1802",
    avatar: "https://i.pravatar.cc/100?img=2",
  },
  {
    id: "3",
    name: "G",
    address: "0x9f90•••3d79",
    avatar: "https://i.pravatar.cc/100?img=3",
  },
];

const WalletSelectionStep = ({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const { close, back, next, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Pay From"
          shouldClose
          onBack={back}
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section>
        {wallets.map((wallet) => {
          const isSelected = wallet.id === selectedId;

          return (
            <PressableScale
              key={wallet.id}
              onPress={() => onSelect(wallet.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Image
                  source={{ uri: wallet.avatar }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                  }}
                />

                <View>
                  <Text className="font-sf-medium" style={trayDemoText.bodyLarge}>
                    {wallet.name}
                  </Text>
                  <Text
                    className="font-sf-regular text-[#94999F]"
                    style={trayDemoText.body}
                  >
                    {wallet.address}
                  </Text>
                </View>
              </View>

              {isSelected ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#41BBFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SymbolView
                    name="checkmark"
                    type="palette"
                    size={18}
                    weight="semibold"
                    tintColor="#fff"
                  />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </Tray.Section>

      <View style={{ paddingTop: 4, paddingBottom: 28, width: "100%" }}>
        <PrimaryButton label="Continue" onPress={next} />
      </View>
    </Tray.Body>
  );
};

const InsufficientTokensStep = () => {
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Insufficient Tokens"
          shouldClose
          onBack={back}
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section>
        <Text
          className="text-[#94999F] font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          This wallet doesn't have the necessary tokens for a refuel. Please add
          more of the supported native tokens or choose a different wallet with
          enough tokens.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const PayFromTray = () => {
  const [selectedId, setSelectedId] = useState("3");
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "wallet-selection",
        content: (
          <WalletSelectionStep selectedId={selectedId} onSelect={setSelectedId} />
        ),
        options: { className: "bg-white" },
      },
      {
        key: "insufficient-tokens",
        content: <InsufficientTokensStep />,
        options: { className: "bg-white" },
      },
    ],
    [selectedId],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger>
        <ExampleTrigger label="Pay From" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default PayFromTray;
