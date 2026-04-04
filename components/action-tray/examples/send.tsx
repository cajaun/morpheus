import React from "react";
import { View, Text } from "react-native";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "@/components/action-tray/content/header";
import { Tray } from "@/components/action-tray";
import { AnimatedOnboardingButton } from "@/components/action-tray/content/button";
import { useTray } from "@/components/action-tray/context/context";
import { SymbolView } from "expo-symbols";

const Send = () => {
  const { next, back, index, total, close } = useTray();

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

      <Tray.Content scale className="bg-black">
        <Tray.Body style={{ paddingHorizontal: 12 }}>
          <Tray.Section>
            <View className="gap-3">
              <PressableScale
                className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4"
                onPress={() => {
                  next();
                }}
              >
                <View className="w-12 h-12 rounded-full  items-center justify-center mr-3 bg-[#358EFF]">
                  <SymbolView
                    name="paperplane.fill"
                    tintColor="#fff"
                    weight="bold"
                  />
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
                    Send
                  </Text>

                  <Text
                    className="text-[#94999F] font-sfMedium"
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    Send tokens or collectibles to any address or ENS username.
                  </Text>
                </View>
              </PressableScale>

              <PressableScale className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4">
                <View className="w-12 h-12 rounded-full  items-center justify-center mr-3 bg-[#747483]">
                  <SymbolView
                    name="arrow.trianglehead.2.clockwise.rotate.90"
                    tintColor="#fff"
                    weight="bold"
                  />
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
                    Swap
                  </Text>

                  <Text
                    className="text-[#94999F] font-sfMedium"
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    Swap your tokens without ever leaving your wallet.
                  </Text>
                </View>
              </PressableScale>

              <PressableScale className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4">
                <View className="w-12 h-12 rounded-full  items-center justify-center mr-3 bg-[#4BCF6C]">
                  <SymbolView
                    name="arrow.down"
                    tintColor="#fff"
                    weight="bold"
                  />
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
                    Receive
                  </Text>

                  <Text
                    className="text-[#94999F] font-sfMedium"
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    Receive Ethereum based assets through your unique address.
                  </Text>
                </View>
              </PressableScale>
            </View>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      <Tray.Content
        scale
        fullScreen 
        className="bg-black"
        style={{ paddingHorizontal: 0 }}
      >
        <Tray.Body>
          <Tray.Section className="gap-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-sfBold text-3xl">Send</Text>

              <PressableScale onPress={back}>
                <SymbolView name="xmark" tintColor="#fff" />
              </PressableScale>
            </View>

            <View className="flex-row items-center bg-[#141414]  rounded-2xl px-4 py-2">
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
                  className="text-white font-sfMedium "
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

            {/* Scan QR */}
            <PressableScale className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-[#111111] items-center justify-center">
                <SymbolView name="qrcode.viewfinder" tintColor="#9CA3AF" />
              </View>

              <View>
                <Text
                  className="text-white font-sfMedium  "
                  style={{
                    fontSize: 21,
                    lineHeight: 28,
                    letterSpacing: 0.2,
                  }}
                >
                  Scan QR Code
                </Text>
                <Text
                  className="text-[#6B6F76] font-sfMedium "
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
                className="text-[#6B6F76] font-sfMedium "
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
                    className="text-white font-sfMedium "
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    Test
                  </Text>
                  <Text
                    className="text-[#6B6F76] font-sfMedium "
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
                    className="text-white font-sfMedium "
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    valmiera
                  </Text>
                  <Text
                    className="text-[#6B6F76] font-sfMedium "
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
                    className="text-white font-sfMedium "
                    style={{
                      fontSize: 21,
                      lineHeight: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    valmiera.eth
                  </Text>
                  <Text
                    className="text-[#6B6F76] font-sfMedium "
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
      </Tray.Content>
    </Tray.Root>
  );
};

export default Send;
