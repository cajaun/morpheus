import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { AaveBorrowIcon, StablecoinIcon } from "../shared/stablecoin-icons";

const TOP_BACKGROUND = "#FCFBFB";
const PURPLE = "#9A96FF";
const MUTED_TEXT = "#858585";
const ROW_BACKGROUND = "#FCFBFB";

const AaveMark = () => (
  <View className="h-16 w-14 items-start justify-start">
    <AaveBorrowIcon />
  </View>
);

const StablecoinRow = ({
  name,
  ticker,
  icon,
  backgroundColor,
}: {
  name: string;
  ticker: string;
  icon: ReactNode;
  backgroundColor?: string;
}) => (
  <View
    className="h-12 w-full flex-row items-center justify-between rounded-2xl px-4"
    style={{ backgroundColor: backgroundColor ?? ROW_BACKGROUND }}
  >
    <View className="flex-row items-center gap-3">
      {icon}
      <Text className="font-medium text-black" style={trayDemoText.Title3}>
        {name}
      </Text>
    </View>
    <Text className="font-medium" style={[trayDemoText.Title3, { color: MUTED_TEXT }]}>
      {ticker}
    </Text>
  </View>
);

const AddStablecoinsHeader = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Header
      style={{
        backgroundColor: TOP_BACKGROUND,
        marginHorizontal: -28,
        paddingHorizontal: 28,
      }}
    >
      <Tray.HeaderRow
        right={
          <Tray.HeaderButton onPress={close}>
            <SymbolView
              name="xmark"
              type="palette"
              tintColor={MUTED_TEXT}
              size={TRAY_HEADER_CLOSE_ICON_SIZE}
              weight="bold"
            />
          </Tray.HeaderButton>
        }
      >
        <View />
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const AddStablecoinsFooter = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Footer style={{ backgroundColor: "#FFFFFF" }}>
      <Tray.PrimaryButton onPress={close} style={{ backgroundColor: PURPLE }}>
        <Text className="font-bold text-white" style={trayDemoText.Button}>
          I Understand, Continue
        </Text>
      </Tray.PrimaryButton>
    </Tray.Footer>
  );
};

const AddStablecoinsStep = () => (
  <Tray.Body style={{ paddingHorizontal: 0 }}>
    <View className="w-full" style={{ backgroundColor: TOP_BACKGROUND }}>
      <View className="-mt-4 px-9 pb-9 pt-0">
        <AaveMark />

        <Text
          className="mt-6 font-semibold text-black"
          style={trayDemoText.LargeTitle}
        >
          Add Stablecoins
        </Text>

        <View className="mt-6 flex-row items-center gap-2">
          <SymbolView
            name="clock"
            tintColor={PURPLE}
            size={22}
         
          />
          <Text className="font-semibold" style={[trayDemoText.Body, { color: PURPLE }]}>
            Less than 30s to receive
          </Text>
        </View>
      </View>
    </View>

    <View className="w-full bg-white px-9 pb-0 pt-9">
      <Text className="font-medium" style={[trayDemoText.Title3, { color: MUTED_TEXT }]}>
        To start earning interest, send any of{"\n"}the following stablecoins to your{"\n"}Aave wallet address.
      </Text>

      <View className="mt-8 gap-2">
        <StablecoinRow name="GHO" ticker="GHO" icon={<StablecoinIcon kind="gho" />} />
        <StablecoinRow
          name="USD Coin"
          ticker="USDC"
          icon={<StablecoinIcon kind="usdc" />}
          backgroundColor="#FFFFFF"
        />
        <StablecoinRow name="Tether" ticker="USDT" icon={<StablecoinIcon kind="usdt" />} />
      </View>

      <Text
        className="mt-8 font-medium"
        style={[trayDemoText.Subheadline, { color: MUTED_TEXT }]}
      >
        Please note Aave accepts stablecoin on major EVM networks.
      </Text>
    </View>
  </Tray.Body>
);

const AddStablecoinsTray = () => (
  <Tray.Root
    stepOptions={{
      className: "bg-white",
      footerStyle: { backgroundColor: "#FFFFFF" },
    }}
    footer={<AddStablecoinsFooter />}
  >
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Add Stablecoins" />
    </Tray.Trigger>

    <Tray.Step >
      <AddStablecoinsHeader />
      <AddStablecoinsStep />
    </Tray.Step>
  </Tray.Root>
);

export default AddStablecoinsTray;
