import React, { useState } from "react";
import { View, Text } from "react-native";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { SymbolView, type SFSymbol } from "expo-symbols";

type SendAction = "send" | "swap";

const ActionRow = ({
  icon,
  iconBackgroundColor,
  label,
  description,
  onPress,
}: {
  icon: SFSymbol;
  iconBackgroundColor: string;
  label: string;
  description: string;
  onPress?: () => void;
}) => {
  return (
    <PressableScale
      className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4"
      onPress={onPress}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          backgroundColor: iconBackgroundColor,
        }}
      >
        <SymbolView name={icon} tintColor="#fff" weight="bold" />
      </View>

      <View className="flex-1">
        <Text
          className="font-sfMedium text-white"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>

        <Text
          className="text-[#94999F] font-sfMedium"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {description}
        </Text>
      </View>
    </PressableScale>
  );
};

const FullScreenActionHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className="text-white font-sfBold"
        style={{
          fontSize: 32,
          lineHeight: 40,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>

      <PressableScale onPress={onClose}>
        <SymbolView name="xmark" tintColor="#fff" size={30} weight="regular" />
      </PressableScale>
    </View>
  );
};

const SendDestinationStep = ({
  fullScreen = false,
}: {
  fullScreen?: boolean;
}) => {
  const { back } = useTray();

  return (
    <Tray.Body fullScreen={fullScreen} style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <FullScreenActionHeader title="Send" onClose={back} />

        <View className="flex-row items-center bg-[#141414] rounded-2xl px-4 py-2">
          <Text
            className="text-[#6B6F76] flex-1 font-sfMedium"
            style={{
              fontSize: 21,
              lineHeight: 28,
              letterSpacing: 0.2,
            }}
          >
            To ENS or Address
          </Text>

          <PressableScale className="bg-[#2B2B2B] px-4 py-1 rounded-full">
            <Text
              className="text-white font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
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
              className="text-white font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Scan QR Code
            </Text>
            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 18,
              }}
            >
              Tap to scan an address
            </Text>
          </View>
        </PressableScale>

        <View className="gap-6">
          <Text
            className="text-[#6B6F76] font-sfMedium"
            style={{
              fontSize: 18,
            }}
          >
            Your Wallets
          </Text>

          <PressableScale className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center">
              <Text className="text-xl">😁</Text>
            </View>

            <View>
              <Text
                className="text-white font-sfMedium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                Test
              </Text>
              <Text
                className="text-[#6B6F76] font-sfMedium"
                style={{
                  fontSize: 18,
                }}
              >
                No Previous Transactions
              </Text>
            </View>
          </PressableScale>

          <PressableScale className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-[#1F2937]" />

            <View>
              <Text
                className="text-white font-sfMedium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                valmiera
              </Text>
              <Text
                className="text-[#6B6F76] font-sfMedium"
                style={{
                  fontSize: 18,
                }}
              >
                No Previous Transactions
              </Text>
            </View>
          </PressableScale>
        </View>

        <View className="gap-6">
          <Text
            className="text-[#6B6F76] font-sfMedium"
            style={{
              fontSize: 18,
            }}
          >
            Watched Wallets
          </Text>

          <PressableScale className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-[#134E4A] items-center justify-center">
              <View className="w-6 h-6 bg-yellow-400 rounded-sm" />
            </View>

            <View>
              <Text
                className="text-white font-sfMedium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                valmiera.eth
              </Text>
              <Text
                className="text-[#6B6F76] font-sfMedium"
                style={{
                  fontSize: 18,
                }}
              >
                No Previous Transactions
              </Text>
            </View>
          </PressableScale>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const SwapEmptyStateStep = ({
  fullScreen = false,
}: {
  fullScreen?: boolean;
}) => {
  const { back } = useTray();
  const [query, setQuery] = useState("");

  return (
    <Tray.Body fullScreen={fullScreen} style={{ paddingHorizontal: 20 }}>
      <View style={{ gap: 24 }}>
        <FullScreenActionHeader title="Swap" onClose={back} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderRadius: 28,
            backgroundColor: "#141414",
            paddingHorizontal: 18,
            paddingVertical: 16,
          }}
        >
          <SymbolView
            name="magnifyingglass"
            tintColor="#4A4A50"
            size={25}
            weight="semibold"
          />

          <Tray.TextInput
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="default"
            placeholder="Search Your Tokens"
            placeholderTextColor="#4A4A50"
            returnKeyType="search"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="none"
            style={{
              flex: 1,
              fontFamily: "Sf-medium",
              fontSize: 20,
              lineHeight: 30,
              letterSpacing: 0.2,
              color: "#FFFFFF",
              margin: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
          />
        </View>

       
      </View>
    </Tray.Body>
  );
};

const Send = () => {
  const { next } = useTray();
  const [selectedAction, setSelectedAction] = useState<SendAction>("send");

  return (
    <Tray.Root>
      <Tray.Trigger>
        <PressableScale
          style={{
            backgroundColor: "#F5F5FA",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 36,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text className="text-2xl font-sfBold">Send</Text>
        </PressableScale>
      </Tray.Trigger>

      <Tray.Content key="send-entry" scale className="bg-black">
        <Tray.Body style={{ paddingHorizontal: 12 }}>
          <Tray.Section>
            <View className="gap-3">
              <ActionRow
                icon="paperplane.fill"
                iconBackgroundColor="#358EFF"
                label="Send"
                description="Send tokens or collectibles to any address or ENS username."
                onPress={() => {
                  setSelectedAction("send");
                  next();
                }}
              />

              <ActionRow
                icon="arrow.trianglehead.2.clockwise.rotate.90"
                iconBackgroundColor="#747483"
                label="Swap"
                description="Swap your tokens without ever leaving your wallet."
                onPress={() => {
                  setSelectedAction("swap");
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
      </Tray.Content>

      <Tray.Content
        key={`send-destination-${selectedAction}`}
        scale
        fullScreen
        className="bg-black"
        style={{ paddingHorizontal: 0 }}
      >
        {selectedAction === "swap" ? (
          <SwapEmptyStateStep />
        ) : (
          <SendDestinationStep />
        )}
      </Tray.Content>
    </Tray.Root>
  );
};

export default Send;
