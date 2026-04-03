import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "@/components/action-tray/content/header";
import { Tray } from "@/components/action-tray";
import { AnimatedOnboardingButton } from "@/components/action-tray/content/button";
import { useTray } from "@/components/action-tray/context/context";
import { SymbolView } from "expo-symbols";
import { ButtonsGrid } from "./button-grid";

const PostExample = () => {
  const { next, back, index, total, close } = useTray();
  const [input, updateInput] = useState<number>(0);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
            <Text className="text-2xl font-sfBold">Open Tray</Text>
          </PressableScale>
        </Tray.Trigger>

        <Tray.Content scale>
          <Tray.Body>
            <Tray.Header>
              <Header
                step={0}
                leftLabel="Choose Chains"
                shouldClose
                onClose={() => back()}
              />

              <View
                style={{
                  height: 1,
                  width: "100%",
                  backgroundColor: "#F7F7F7",
                }}
              />
            </Tray.Header>

            <Tray.Section>
              <PressableScale
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
                    gap: 14,
                  }}
                >
                  <SymbolView
                    name="circle.hexagonpath.fill"
                    size={28}
                    tintColor="#2563EB"
                  />
                  <Text
                    className=" text-black"
                    style={{
                      fontSize: 18,
                      lineHeight: 26,
                      letterSpacing: 0.2,
                    }}
                  >
                    Base
                  </Text>
                </View>

                <SymbolView
                  name="checkmark.circle.fill"
                  size={30}
                  tintColor="#41BBFF"
                />
              </PressableScale>

              <PressableScale
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
                    gap: 14,
                  }}
                >
                  <SymbolView name="flame.fill" size={28} tintColor="#EF4444" />
                  <Text
                    className=" text-black"
                    style={{
                      fontSize: 18,
                      lineHeight: 26,
                      letterSpacing: 0.2,
                    }}
                  >
                    Optimism
                  </Text>
                </View>

                <SymbolView name="circle" size={30} tintColor="#D1D5DB" />
              </PressableScale>

              {/* Arbitrum */}
              <PressableScale
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
                    gap: 14,
                  }}
                >
                  <SymbolView name="cube.fill" size={28} tintColor="#334155" />
                  <Text
                    className=" text-black"
                    style={{
                      fontSize: 18,
                      lineHeight: 26,
                      letterSpacing: 0.2,
                    }}
                  >
                    Arbitrum
                  </Text>
                </View>

                <SymbolView name="circle" size={30} tintColor="#D1D5DB" />
              </PressableScale>

              <PressableScale
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
                    gap: 14,
                  }}
                >
                  <SymbolView
                    name="link.circle.fill"
                    size={22}
                    tintColor="#7C3AED"
                  />
                  <Text
                    className=" text-black"
                    style={{
                      fontSize: 18,
                      lineHeight: 26,
                      letterSpacing: 0.2,
                    }}
                  >
                    Polygon
                  </Text>
                </View>

                <SymbolView name="circle" size={30} tintColor="#D1D5DB" />
              </PressableScale>
            </Tray.Section>
          </Tray.Body>
        </Tray.Content>

        <Tray.Content scale>
          <Tray.Body>
            <Tray.Header>
              <Header
                step={1}
                leftLabel="Choose Amount"
                shouldClose
                onClose={() => back()}
              />
            </Tray.Header>

            <View
              style={{
                height: 1,
                width: "100%",
                backgroundColor: "#F7F7F7",
              }}
            />

            <Tray.Section>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 16,
                  lineHeight: 24,
                  color: "#9CA3AF",
                }}
                className="font-sfRegular"
              >
                Choose the amount of gas you’d like to{"\n"}
                top up on your selected chain.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  rowGap: 20,
                }}
              >
                {["$2", "$5", "$10", "$20", "$50", "Custom"].map((amount) => (
                  <PressableScale
                    key={amount}
                    style={{
                      width: "30%",
                      height: 70,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#F3F4F6",
                      borderRadius: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        color: "#111827",
                      }}
                      className="font-sfMedium"
                    >
                      {amount}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </Tray.Section>
          </Tray.Body>
        </Tray.Content>

        <Tray.Content scale>
          <Tray.Body>
            <Tray.Header>
              <Header
                step={1}
                leftLabel="Custom Amount"
                shouldClose
                onClose={() => back()}
              />
            </Tray.Header>

            <View
              style={{
                height: 1,
                width: "100%",
                backgroundColor: "#F7F7F7",
              }}
            />

            <Tray.Section>
              <View style={{ gap: 24 }}>
                {/* Amount Display */}
                <View
                  style={{
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 70,
                      fontWeight: "600",
                      color: "#111",
                    }}
                  >
                    ${input}
                  </Text>
                </View>

                <View>
                  <Text
                    className="text-center"
                    style={{
                      fontSize: 16,
                      color: "#9CA3AF",
                    }}
                  >
                    Max Amount: $50
                  </Text>
                </View>
                <View></View>
                <ButtonsGrid input={input} />
              </View>
            </Tray.Section>
          </Tray.Body>
        </Tray.Content>

        <Tray.Footer>
          <AnimatedOnboardingButton
            step={index}
            totalSteps={total}
            onNext={next}
            onSecondaryPress={back}
            showSecondary={index === 4}
          />
        </Tray.Footer>
      </Tray.Root>
    </View>
  );
};

export default PostExample;
