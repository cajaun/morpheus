import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "../content/header";
import { SymbolView } from "expo-symbols";

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

const PayFromTray = () => {
  const { close, back, next } = useTray();
  const [selectedId, setSelectedId] = useState("3");

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
          <Text className="text-2xl font-sfBold">Pay From</Text>
        </PressableScale>
      </Tray.Trigger>

      <Tray.Content scale>
        <Tray.Body>
          {/* HEADER */}
          <Tray.Header>
            <Header
              step={0}
              leftLabel="Pay From"
              shouldClose
              onBack={() => back()}
              onClose={() => close()}
            />
          </Tray.Header>
          {/* DIVIDER */}
          <View
            style={{
              height: 1,
              backgroundColor: "#F2F2F2",
            }}
          />

          <Tray.Section>
            {wallets.map((wallet) => {
              const isSelected = wallet.id === selectedId;

              return (
                <PressableScale
                  key={wallet.id}
                  onPress={() => setSelectedId(wallet.id)}
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
                      <Text
                        className=" font-sfMedium"
                        style={{
                          fontSize: 21,
                          // lineHeight: 28,
                          // letterSpacing: 0.2,
                        }}
                      >
                        {wallet.name}
                      </Text>
                      <Text
                        className=" font-sfRegular text-[#94999F] "
                        style={{
                          fontSize: 18,
                          // lineHeight: 28,
                          // letterSpacing: 0.2,
                        }}
                      >
                        {wallet.address}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
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
                        tintColor={"#fff"}
                      />
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </Tray.Section>

          <View style={{ paddingTop: 4, paddingBottom: 28, width: "100%" }}>
            <PressableScale
              style={{
                backgroundColor: "#41BBFF",
                height: 50,
                borderRadius: 36,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
              onPress={() => {
                next();
              }}
            >
              <Text
                className=" font-sfSemibold text-white"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                Continue
              </Text>
            </PressableScale>
          </View>
        </Tray.Body>
      </Tray.Content>

      <Tray.Content scale fullScreen>
        <Tray.Body>
          <Tray.Header>
            <Header
              step={1}
              leftLabel="Insufficient Tokens"
              shouldClose
              onBack={() => back()}
              onClose={() => close()}
            />
          </Tray.Header>

          <View
            style={{
              height: 1,
              backgroundColor: "#F2F2F2",
            }}
          />

          <Tray.Section>
            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This wallet doesn't have the necessary tokens for a refuel. Please
              add more of the supported native tokens or choose a different
              wallet with enough tokens.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>
    </Tray.Root>
  );
};

export default PayFromTray;
