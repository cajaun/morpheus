import { useState, type ReactNode } from "react";
import {
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { ExampleTrigger } from "../shared/example-trigger";
import { AaveBorrowIcon, StablecoinIcon } from "../shared/stablecoin-icons";

const PURPLE = "#8E8BFF";
const MUTED = "#858585";
const COLORS = {
  white: "#FFFFFF",
  disabled: "#DCDBFF",
} as const;
const STABLECOINS_BACKGROUND = "#FCFBFB";
const STABLECOINS_PURPLE = "#9A96FF";

const PaymentFieldShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) => <View className={className}>{children}</View>;

const PaymentButton = ({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <Tray.PrimaryButton
    onPress={disabled ? undefined : onPress}
    style={{
      backgroundColor: disabled ? COLORS.disabled : PURPLE,
    }}
  >
    <Text className="text-[21px] leading-7 tracking-[0.2px] font-bold text-white">
      {label}
    </Text>
  </Tray.PrimaryButton>
);

const PaymentMethodHeader = ({
  title,
  showBack = false,
}: {
  title: string;
  showBack?: boolean;
}) => {
  const { back, close } = useTrayNavigation();
  const left = showBack ? (
    <Tray.HeaderButton onPress={back}>
      <SymbolView
        name="chevron.left"
        type="palette"
        tintColor="#787878"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
      />
    </Tray.HeaderButton>
  ) : undefined;

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={left}
        right={
          left == null ? (
            <Tray.HeaderButton onPress={close}>
              <SymbolView
                name="xmark"
                type="palette"
                tintColor="#787878"
                size={TRAY_HEADER_CLOSE_ICON_SIZE}
                weight="bold"
              />
            </Tray.HeaderButton>
          ) : undefined
        }
      >
        <Text className="text-[25px] leading-7.5 tracking-[0.2px] font-semibold text-black">
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const BankLogoCluster = () => (
  <View className="flex-row items-center w-18 shrink-0">
    <View
      className="w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#004BFF" }}
    >
      <Text className="text-[16px] font-bold text-white">▣</Text>
    </View>
    <View
      className="-ml-2.25 w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#BB0125" }}
    >
      <Text className="text-[9px] font-bold text-white">WF</Text>
    </View>
    <View
      className="-ml-2.25 w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#003754" }}
    >
      <Text className="text-[9px] font-bold text-white">C1</Text>
    </View>
  </View>
);

const StablecoinLogoCluster = () => (
  <View className="flex-row items-center w-18 shrink-0">
    <View
      className="w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#009A6D" }}
    >
      <Text className="text-[16px] font-bold text-white">₮</Text>
    </View>
    <View
      className="-ml-2.25 w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#006BCA" }}
    >
      <Text className="text-[16px] font-bold text-white">¢</Text>
    </View>
    <View
      className="-ml-2.25 w-7.5 h-7.5 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: "#00D13A" }}
    >
      <Text className="text-[16px] font-bold text-white">●</Text>
    </View>
  </View>
);

const StablecoinRow = ({
  name,
  ticker,
  icon,
  backgroundColor = STABLECOINS_BACKGROUND,
}: {
  name: string;
  ticker: string;
  icon: ReactNode;
  backgroundColor?: string;
}) => (
  <View
    className="h-12 w-full flex-row items-center justify-between rounded-2xl px-4"
    style={{ backgroundColor }}
  >
    <View className="flex-row items-center gap-3">
      {icon}
      <Text className="font-medium text-black" style={trayDemoText.Title3}>
        {name}
      </Text>
    </View>
    <Text
      className="font-medium"
      style={[trayDemoText.Title3, { color: MUTED }]}
    >
      {ticker}
    </Text>
  </View>
);

const AddPaymentStablecoinsHeader = () => {
  const { back } = useTrayNavigation();

  return (
    <Tray.Header>
      <Tray.HeaderRow
        right={
          <Tray.HeaderButton onPress={back}>
            <SymbolView
              name="xmark"
              type="palette"
              tintColor={MUTED}
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

const AddPaymentSelectionHeader = ({ title }: { title: string }) => {
  const { back } = useTrayNavigation();

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={
          <Tray.HeaderButton onPress={back}>
            <SymbolView
              name="chevron.left"
              type="palette"
              tintColor={MUTED}
              size={TRAY_HEADER_CLOSE_ICON_SIZE}
              weight="semibold"
            />
          </Tray.HeaderButton>
        }
      >
        <Text className="font-semibold text-black" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const AddPaymentStablecoinsStep = () => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <View className="w-full" style={{ backgroundColor: STABLECOINS_BACKGROUND }}>
        <View className="-mt-4 px-9 pb-8 pt-0">
          <View className="h-16 w-14 items-start justify-start">
            <AaveBorrowIcon />
          </View>

          <Text className="mt-6 font-semibold text-black" style={trayDemoText.LargeTitle}>
            Add Stablecoins
          </Text>

          <View className="mt-6 flex-row items-center gap-2">
            <SymbolView name="clock" tintColor={STABLECOINS_PURPLE} size={22} />
            <Text
              className="font-semibold"
              style={[trayDemoText.Body, { color: STABLECOINS_PURPLE }]}
            >
              Less than 30s to receive
            </Text>
          </View>
        </View>
      </View>

      <Tray.Section className="bg-white px-9 pt-8 pb-7" withAction>
        <Text className="font-medium" style={[trayDemoText.Title3, { color: MUTED }]}>
          To start earning interest, send any of{"\n"}the following stablecoins to your{"\n"}Aave wallet address.
        </Text>

        <View className="mt-2 gap-2">
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
          className="mt-2 font-medium"
          style={[trayDemoText.Subheadline, { color: MUTED }]}
        >
          Please note Aave accepts stablecoin on major EVM networks.
        </Text>

        <Tray.PrimaryButton
          onPress={next}
          style={{ backgroundColor: STABLECOINS_PURPLE }}
        >
          <Text className="font-semibold text-white" style={trayDemoText.Button}>
            I Understand, Continue
          </Text>
        </Tray.PrimaryButton>
      </Tray.Section>
    </Tray.Body>
  );
};

const CurrencyOption = ({
  icon,
  name,
  ticker,
  onPress,
}: {
  icon: ReactNode;
  name: string;
  ticker: string;
  onPress: () => void;
}) => (
  <PressableScale onPress={onPress} className="w-full">
    <View className="h-24 w-full flex-row items-center gap-4 rounded-3xl border border-[#EAEAEA] bg-white px-5">
      <View className="h-12 w-12 items-center justify-center">
        <View style={{ transform: [{ scale: 1.55 }] }}>{icon}</View>
      </View>
      <View className="gap-1">
        <Text className="font-semibold text-black" style={trayDemoText.Title2}>
          {name}
        </Text>
        <Text className="font-medium" style={[trayDemoText.Title3, { color: MUTED }]}>
          {ticker}
        </Text>
      </View>
    </View>
  </PressableScale>
);

const AddPaymentCurrencyStep = () => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section className="gap-4 pt-6 pb-7">
        <CurrencyOption icon={<StablecoinIcon kind="gho" />} name="GHO" ticker="GHO" onPress={next} />
        <CurrencyOption icon={<StablecoinIcon kind="usdc" />} name="USD Coin" ticker="USDC" onPress={next} />
        <CurrencyOption icon={<StablecoinIcon kind="usdt" />} name="Tether" ticker="USDT" onPress={next} />
      </Tray.Section>
    </Tray.Body>
  );
};

const NetworkLogo = ({ label, color }: { label: string; color: string }) => (
  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
    <Text className="text-[18px] font-bold text-white">{label}</Text>
  </View>
);

const AddGhoNetworkLogo = () => (
  <View className="h-5 w-5 items-center justify-center rounded-full bg-[#2D3E58]">
    <Text className="text-[10px] font-bold text-white">A</Text>
  </View>
);

const NetworkOption = ({
  label,
  logo,
  comingSoon = false,
  onPress,
}: {
  label: string;
  logo: ReactNode;
  comingSoon?: boolean;
  onPress?: () => void;
}) => (
  <PressableScale
    onPress={onPress}
    className="w-full"
  >
    <View className="h-18 w-full flex-row items-center justify-between rounded-3xl border border-[#EAEAEA] bg-white px-5">
      <View className="flex-row items-center gap-4">
        {logo}
        <Text
          className="font-semibold"
          style={[trayDemoText.Title2, { color: comingSoon ? MUTED : "#111111" }]}
        >
          {label}
        </Text>
      </View>
      {comingSoon ? (
        <Text className="font-semibold text-[#D0D0D0]" style={trayDemoText.Title3}>
          Coming Soon
        </Text>
      ) : null}
    </View>
  </PressableScale>
);

const AddPaymentNetworkStep = () => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section className="gap-4 pt-6 pb-7">
        <NetworkOption
          label="Arbitrum"
          logo={<NetworkLogo label="A" color="#2D3E58" />}
          onPress={next}
        />
        <NetworkOption label="Base" comingSoon logo={<NetworkLogo label="—" color="#8BAEFF" />} />
        <NetworkOption label="Ethereum" comingSoon logo={<NetworkLogo label="♦" color="#A9AAAF" />} />
        <NetworkOption label="Polygon" comingSoon logo={<NetworkLogo label="⬡" color="#B79AEF" />} />
        <NetworkOption label="Avalanche" comingSoon logo={<NetworkLogo label="▲" color="#F39AA8" />} />
      </Tray.Section>
    </Tray.Body>
  );
};

const AddPaymentGhoStep = () => (
  <Tray.Body>
    <Tray.Section className="items-center gap-4 pt-6 pb-7" withAction>
      <Text className="text-center font-semibold text-black" style={trayDemoText.Title3}>
        0x795084695Fd42835Cc4a{"\n"}5b1036c4F1721ec6BdA4
      </Text>

      <View
        className="mt-3 h-64 w-64 rounded-3xl border border-[#F1F1F1] bg-white"
        style={{
          shadowColor: "#000000",
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        }}
      />

      <View className="mt-6 w-full items-center gap-3">
        <AddGhoNetworkLogo />
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold" style={[trayDemoText.Title3, { color: MUTED }]}>
            Arbitrum Deposit Address
          </Text>
          <SymbolView
            name="info.circle"
            type="palette"
            tintColor={MUTED}
            size={20}
            weight="regular"
          />
        </View>
        <Text
          className="w-full text-center font-medium"
          style={[trayDemoText.Subheadline, { color: MUTED, fontSize: 15 }]}
        >
          Only send GHO on Arbitrum. Deposit addresses{"\n"}may differ by network and can change.
        </Text>
      </View>

      <Tray.PrimaryButton style={{ backgroundColor: "#F5F5F5" }}>
        <Text className="font-bold text-black" style={trayDemoText.Button}>
          Copy Address
        </Text>
      </Tray.PrimaryButton>
    </Tray.Section>
  </Tray.Body>
);

const PaymentMethodCard = ({
  children,
  onPress,
  className,
}: {
  children: ReactNode;
  onPress: () => void;
  className: string;
}) => (
  <PressableScale
    onPress={onPress}
    className={className}
  >
    {children}
  </PressableScale>
);

const AddPaymentMethodStep = () => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section className="gap-4 pt-7 pb-7">
        <PaymentMethodCard
          className="w-full h-34 gap-4 rounded-3xl border border-[#EAEAEA] bg-white px-5 py-4"
          onPress={next}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 shrink">
              <Text className="text-[23px] leading-7 font-semibold text-black" numberOfLines={1}>
                Bank Account
              </Text>
              <Text className="text-[17px] leading-5.5 font-medium text-[#858585]" numberOfLines={1}>
                Up to $15,000
              </Text>
            </View>

            <View className="w-23.25 h-6 items-center justify-center rounded-lg bg-[#01CF47]">
              <Text className="text-[17px] leading-5.5 font-semibold text-white">Suggested</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <BankLogoCluster />
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] leading-5.5 font-medium text-[#858585]" numberOfLines={1}>
                Instant bank connection
              </Text>
              <Text className="text-[17px] leading-5.5 font-medium text-[#858585]" numberOfLines={1}>
                Powered by Plaid
              </Text>
            </View>
          </View>
        </PaymentMethodCard>

        <PaymentMethodCard
          className="w-full h-20 justify-center gap-4 rounded-3xl border border-[#EAEAEA] bg-white px-5 py-3.5"
          onPress={next}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 shrink">
              <Text
                className="text-[23px] leading-7 font-semibold text-black"
                numberOfLines={1}
              >
                Stablecoin Wallet
              </Text>
              <Text
                className="text-[17px] leading-5.5 font-medium text-[#858585]"
                numberOfLines={1}
              >
                Unlimited
              </Text>
            </View>

            <StablecoinLogoCluster />
          </View>
        </PaymentMethodCard>
      </Tray.Section>
    </Tray.Body>
  );
};

const AddressField = ({
  value,
  onChangeText,
  autoFocus = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
}) => (
  <PaymentFieldShell className="flex-row items-center h-12.5 gap-0 rounded-2xl bg-[#F5F5F5] pl-4 pr-2.5">
    <SymbolView
      name="magnifyingglass"
      type="palette"
      tintColor={MUTED}
      size={22}
    
    />
    <Tray.TextInput
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect={false}
      autoFocus={autoFocus}
      keyboardType="ascii-capable"
      placeholder="ENS or Address"
      placeholderTextColor="#A9A9A9"
      returnKeyType="done"
      selectionColor={PURPLE}
      spellCheck={false}
      className="min-w-0 flex-1 ml-2 h-8 p-0 text-[20px] leading-6 font-medium text-[#101318]"
      textContentType="none"
    />
    <PressableScale
      className="w-16.5 h-8 items-center justify-center rounded-full bg-[#8E8BFF]"
      onPress={() => onChangeText("benji.eth")}
    >
      <Text className="text-[18px] leading-7 tracking-[0.2px] font-semibold text-white">
        Paste
      </Text>
    </PressableScale>
  </PaymentFieldShell>
);

const AddWalletAddressStep = ({
  address,
  onChangeAddress,
}: {
  address: string;
  onChangeAddress: (value: string) => void;
}) => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section
        className="gap-4 pt-6 pb-7"
        withAction
      >
        <AddressField
          value={address}
          onChangeText={onChangeAddress}
          autoFocus
        />

        <View className="h-44 items-center justify-center gap-5 px-4">
          <SymbolView
            name="binoculars.fill"
            type="palette"
            tintColor="#D0D1D4"
            size={70}
            weight="medium"
          />
          <Text className="text-center text-[20px] leading-7 tracking-[0.2px] font-medium text-[#A9A9A9]">
            Search or paste an address to{"\n"}add a stablecoin wallet
          </Text>
        </View>

        <PaymentButton
          label="Next"
          onPress={next}
          disabled={address.trim().length === 0}
        />
      </Tray.Section>
    </Tray.Body>
  );
};

const AddressDetailsStep = ({
  address,
  onChangeAddress,
}: {
  address: string;
  onChangeAddress: (value: string) => void;
}) => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section
        className="gap-4 pt-6 pb-7"
        withAction
      >
        <View className="relative h-27 w-27 self-center items-center justify-center mb-4 rounded-full bg-[#EBEAEA]">
          <SymbolView
            name="rectangle.on.rectangle.angled"
            type="palette"
            tintColor="#B8B9BC"
            size={64}
            weight="medium"
          />
          <View
            className="absolute right-0 bottom-0 h-10 w-10 items-center justify-center rounded-full bg-white"
            style={{
              shadowColor: "#000000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
          >
            <SymbolView
              name="pencil"
              type="palette"
              tintColor="#000000"
              size={24}
              weight="bold"
            />
          </View>
        </View>

        <PaymentFieldShell className="h-12 w-full items-center justify-center rounded-3xl bg-[#F5F5F5] px-5">
          <Tray.TextInput
            value={address}
            onChangeText={onChangeAddress}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            autoFocus
            keyboardType="ascii-capable"
            returnKeyType="done"
            selectionColor={PURPLE}
            spellCheck={false}
            className="h-8 w-full p-0 text-center text-[20px] leading-6 font-semibold text-[#101318]"
            textAlign="center"
            textContentType="none"
          />
        </PaymentFieldShell>

        <PaymentButton
          label="Add Wallet"
          onPress={close}
        />
      </Tray.Section>
    </Tray.Body>
  );
};

const AddPaymentMethodTray = () => {
  const [address, setAddress] = useState("");

  return (
    <Tray.Root
      stepOptions={{
        className: "bg-white",
      }}
    >
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Add Payment Method" />
      </Tray.Trigger>

      <Tray.Step key="payment-methods">
        <PaymentMethodHeader title="Add Payment Method" />
        <AddPaymentMethodStep />
      </Tray.Step>

      <Tray.Step
        key="add-stablecoins"
        options={{ className: "bg-[#FCFBFB]" }}
      >
        <AddPaymentStablecoinsHeader />
        <AddPaymentStablecoinsStep />
      </Tray.Step>

      <Tray.Step key="currency">
        <AddPaymentSelectionHeader title="Currency" />
        <AddPaymentCurrencyStep />
      </Tray.Step>

      <Tray.Step key="network">
        <AddPaymentSelectionHeader title="Network" />
        <AddPaymentNetworkStep />
      </Tray.Step>

      <Tray.Step key="add-gho">
        <AddPaymentSelectionHeader title="Add GHO" />
        <AddPaymentGhoStep />
      </Tray.Step>

      <Tray.Step
        key="wallet-address"
        options={{
          keyboardAware: true,
        }}
      >
        <PaymentMethodHeader title="Add Wallet Address" showBack />
        <AddWalletAddressStep
          address={address}
          onChangeAddress={setAddress}
        />
      </Tray.Step>

      <Tray.Step
        key="address-details"
        options={{
          keyboardAware: true,
        }}
      >
        <PaymentMethodHeader title="Address Details" showBack />
        <AddressDetailsStep
          address={address}
          onChangeAddress={setAddress}
        />
      </Tray.Step>
    </Tray.Root>
  );
};

export default AddPaymentMethodTray;
