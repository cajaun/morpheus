import { useState, type ReactNode } from "react";
import {
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { ExampleTrigger } from "../shared/example-trigger";

const PURPLE = "#8E8BFF";
const MUTED = "#858585";
const COLORS = {
  white: "#FFFFFF",
  disabled: "#DCDBFF",
} as const;

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
  const { back, close } = useTrayFlow();
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
  const { next } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Section className="gap-4 pt-7 pb-7">
        <PaymentMethodCard
          className="w-full h-34 gap-4 rounded-3xl border border-[#EAEAEA] bg-white px-5 py-4"
          onPress={() => {}}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 shrink">
              <Text
                className="text-[23px] leading-7 font-semibold text-black"
                numberOfLines={1}
              >
                Bank Account
              </Text>
              <Text
                className="text-[17px] leading-5.5 font-medium text-[#858585]"
                numberOfLines={1}
              >
                Up to $15,000
              </Text>
            </View>

            <View className="w-23.25 h-6 items-center justify-center rounded-lg bg-[#01CF47]">
              <Text className="text-[17px] leading-5.5 font-semibold text-white">
                Suggested
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <BankLogoCluster />
            <View className="min-w-0 flex-1">
              <Text
                className="text-[17px] leading-5.5 font-medium text-[#858585]"
                numberOfLines={1}
              >
                Instant bank connection
              </Text>
              <Text
                className="text-[17px] leading-5.5 font-medium text-[#858585]"
                numberOfLines={1}
              >
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
  const { next } = useTrayFlow();

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
  const { close } = useTrayFlow();

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
        footerStyle: { backgroundColor: COLORS.white },
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
