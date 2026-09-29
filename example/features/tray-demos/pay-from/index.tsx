import { useState } from "react";
import { Image, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayFlow,
} from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
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
  {
    id: "4",
    name: "Testing frl",
    address: "0x9f90•••3d79",
    avatar: "https://i.pravatar.cc/100?img=3",
  },
  {
    id: "5",
    name: "F",
    address: "0x9f90•••3d79",
    avatar: "https://i.pravatar.cc/100?img=3",
  },
  {
    id: "6",
    name: "Test",
    address: "0x9f90•••3d79",
    avatar: "https://i.pravatar.cc/100?img=3",
  },
 
];

const WalletSelectionHeader = () => {
  const { close, back } = useTrayFlow();

  return (
    <Tray.Header withSeparator returnButton={
      <Tray.HeaderCloseButton onPress={back}>
        <SymbolView
          name="chevron.left"
          type="palette"
          tintColor="#787878"
          size={TRAY_HEADER_CLOSE_ICON_SIZE}
          weight="semibold"
        />
      </Tray.HeaderCloseButton>
    }>
      <Tray.HeaderRow>
        <Text className="font-medium" style={trayDemoText.Title1}>
          Pay From
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

const WalletSelectionBody = ({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const { next } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Section style={{gap: 16}}>
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
                  <Text className="font-medium" style={trayDemoText.Title2}>
                    {wallet.name}
                  </Text>
                  <Text
                    className="font-normal text-[#94999F]"
                    style={trayDemoText.Body}
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

const InsufficientTokensHeader = () => {
  const { close, back } = useTrayFlow();

  return (
    <Tray.Header withSeparator returnButton={
      <Tray.HeaderCloseButton onPress={back}>
        <SymbolView
          name="chevron.left"
          type="palette"
          tintColor="#787878"
          size={TRAY_HEADER_CLOSE_ICON_SIZE}
          weight="semibold"
        />
      </Tray.HeaderCloseButton>
    }>
      <Tray.HeaderRow>
        <Text className="font-medium" style={trayDemoText.Title1}>
          Insufficient Tokens
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

const InsufficientTokensBody = () => {
  return (
    <Tray.Body>

      <Tray.Section>
        <Text
          className="text-[#94999F] font-medium"
          style={trayDemoText.Title2}
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
  return (
    <Tray.Root stepOptions={{ className: "bg-white" }}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Pay From" />
      </Tray.Trigger>
      <Tray.Step key="wallet-selection">
        <WalletSelectionHeader />
        <WalletSelectionBody selectedId={selectedId} onSelect={setSelectedId} />
      </Tray.Step>
      <Tray.Step key="insufficient-tokens">
        <InsufficientTokensHeader />
        <InsufficientTokensBody />
      </Tray.Step>
    </Tray.Root>
  );
};

export default PayFromTray;
