import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import { Ionicons } from "@expo/vector-icons";

const ExampleTrigger = ({ label }: { label: string }) => {
  return (
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
      <Text className="text-2xl font-sfBold">{label}</Text>
    </PressableScale>
  );
};

const ConsentCheck = () => {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        backgroundColor: "#9895FF",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
      }}
    >
      <SymbolView
        name="checkmark"
        tintColor="#FFFFFF"
        size={14}
        weight="bold"
      />
    </View>
  );
};

const PANEL_BACKGROUND = "#1C1C22";
const HERO_BACKGROUND = "#201F27";
const SEPARATOR = "#2D2D35";
const PRIMARY_TEXT = "#FFFFFF";
const SECONDARY_TEXT = "#A5A4AE";
const MUTED_TEXT = "#8D8C96";
const CLOSE_BACKGROUND = "#3A3942";
const CLOSE_ICON = "#B5B4BD";
const CTA = "#9895FF";

const IdentityRateBoostStep = () => {
  const { close } = useTray();

  return (
    <Tray.Body
      style={{ paddingHorizontal: 0, backgroundColor: PANEL_BACKGROUND }}
    >
      <Tray.Section
        style={{
          gap: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          backgroundColor: PANEL_BACKGROUND,
        }}
      >
        <View
          style={{
            paddingHorizontal: 28,
            paddingTop: 28,
            paddingBottom: 24,
            backgroundColor: HERO_BACKGROUND,
          }}
        >
          <PressableScale
            onPress={close}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: CLOSE_BACKGROUND,
            }}
          >
            <SymbolView
              name="xmark"
              type="palette"
              size={17}
              weight="bold"
              tintColor={CLOSE_ICON}
            />
          </PressableScale>

          <View style={{ gap: 18 }}>
            <View
              style={{
                borderRadius: 16,
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <Ionicons name="rocket-sharp" size={54} color={CTA} />
            </View>

            <Text
              className="font-sfBold"
              style={{
                fontSize: 28,
                lineHeight: 34,
                letterSpacing: 0.2,
                color: PRIMARY_TEXT,
              }}
            >
              Get a 1.00% rate{"\n"}boost by verifying{"\n"}your identity
            </Text>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <SymbolView
                name="clock"
                tintColor={CTA}
                size={16}
                weight="semibold"
              />
              <Text
                className="font-sfBold"
                style={{
                  fontSize: 18,
                  lineHeight: 25,
                  letterSpacing: 0.2,
                  color: CTA,
                }}
              >
                5-10 min to setup
              </Text>
            </View>
          </View>
        </View>

        <Tray.Separator style={{ backgroundColor: SEPARATOR }} />

        <View
          style={{
            gap: 24,
            paddingHorizontal: 28,
            paddingTop: 28,
            backgroundColor: PANEL_BACKGROUND,
          }}
        >
          <View style={{ gap: 16 }}>
            <Text
              className="font-sfSemibold"
              style={{
                fontSize: 18,
                lineHeight: 25,
                letterSpacing: 0.2,
                color: SECONDARY_TEXT,
              }}
            >
              Complete identity verification with Push by Aave Labs to boost
              your rate by 1.00% APY for 90 days.
            </Text>

            <View style={{ gap: 8 }}>
              <Text
                className="font-sfBold"
                style={{
                  fontSize: 19,
                  lineHeight: 24,
                  letterSpacing: 0.15,
                  color: PRIMARY_TEXT,
                }}
              >
                Earn even more
              </Text>

              <Text
                className="font-sfSemibold"
                style={{
                  fontSize: 18,
                  lineHeight: 25,
                  letterSpacing: 0.18,
                  color: MUTED_TEXT,
                }}
              >
                After you've verified your identity, we'll show you how you can
                earn an extra +2.50% APY by inviting friends.
              </Text>
            </View>
          </View>

          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
          >
            <ConsentCheck />

            <Text
              className="font-sfMedium"
              style={{
                flex: 1,
                fontSize: 14,
                lineHeight: 20,
                letterSpacing: 0.12,
                color: MUTED_TEXT,
              }}
            >
              I agree to Push by Aave Labs'{" "}
              <Text
                className="font-sfSemibold"
                style={{ color: SECONDARY_TEXT }}
              >
                Customer Agreement
              </Text>{" "}
              and{" "}
              <Text
                className="font-sfSemibold"
                style={{ color: SECONDARY_TEXT }}
              >
                Privacy Policy.
              </Text>
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 24,
            backgroundColor: PANEL_BACKGROUND,
            width: "100%",
          }}
        >
          <PressableScale
            onPress={close}
            style={{
              backgroundColor: CTA,
              height: 52,
              borderRadius: 36,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Text
              className="font-sfSemibold text-white"
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
      </Tray.Section>
    </Tray.Body>
  );
};

const IdentityRateBoostTray = () => {
  return (
    <Tray.Root>
      <Tray.Trigger>
        <ExampleTrigger label="Identity Boost" />
      </Tray.Trigger>

      <Tray.Content
        scale
        className="bg-[#1E1E25]"
        style={{ backgroundColor: PANEL_BACKGROUND }}
      >
        <IdentityRateBoostStep />
      </Tray.Content>
    </Tray.Root>
  );
};

export default IdentityRateBoostTray;
