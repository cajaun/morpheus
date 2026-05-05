import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";

const ACCENT = "#3EB1FF";
const HERO_TEXT = "#D9F0FF";
const BODY_TEXT = "#989CA4";

export type CreatingWalletsInfoCopy = {
  title: string;
  subtitle: string;
  intro: string;
  firstSectionTitle: string;
  firstSectionBody: string;
  secondSectionTitle: string;
  secondSectionBody: string;
  buttonLabel: string;
};

const DEFAULT_CREATING_WALLETS_INFO_COPY: CreatingWalletsInfoCopy = {
  title: "Creating Wallets",
  subtitle: "Learn about creating wallets",
  intro:
    "Creating a new wallet in Family equips you with the ability to securely store, transact, and manage your Ethereum assets. Whether you're just beginning your crypto journey or looking to expand your existing digital portfolio, Family offers a straightforward approach to wallet creation.",
  firstSectionTitle: "Creating your first wallet",
  firstSectionBody:
    "When you create your first wallet in Family, you're not just generating a single address. Instead, you're creating what we call a 'Wallet Group' Each Wallet Group comes with a unique Secret Recovery Phrase that can be used to generate a multitude of individual wallets. This way, you get to manage multiple wallets with a single recovery phrase, enhancing both security and convenience. Remember to safely store this phrase, as it's your key to wallet recovery and is irreplaceable if lost.",
  secondSectionTitle: "Adding wallets to a Wallet Group",
  secondSectionBody:
    "If you're already in possession of a Wallet Group, you can effortlessly add more wallets to it. Doing so consolidates your asset management experience, as you can control different wallet addresses under a single Secret Recovery Phrase. It's a user-friendly method to have a variety of wallets for diverse uses while maintaining simple, top-tier security. By grouping your wallets, you can simplify your journey in the world of ethereum.",
  buttonLabel: "Got It",
};

const WalletArtwork = () => {
  return (
    <View style={{ position: "absolute", top: 16, left: 18 }}>
      <SymbolView
        name="wallet.bifold.fill"
        tintColor="#6ECAFF"
        size={126}
        weight="regular"
      />
    </View>
  );
};

export const CreatingWalletsInfoStep = ({
  copy = DEFAULT_CREATING_WALLETS_INFO_COPY,
}: {
  copy?: CreatingWalletsInfoCopy;
}) => {
  const { close } = useTrayFlow();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <Tray.Section
        style={{ gap: 20, paddingHorizontal: 0, paddingVertical: 0 }}
      >
        <View
          style={{
            borderRadius: 34,
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View
            style={{
              backgroundColor: ACCENT,
              minHeight: 206,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 24,
              justifyContent: "flex-end",
            }}
          >
            <WalletArtwork />

            <PressableScale
              onPress={close}
              style={{
                position: "absolute",
                top: 22,
                right: 22,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(126, 208, 255, 0.9)",
              }}
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={18}
                weight="bold"
                tintColor="#FFFFFF"
              />
            </PressableScale>

            <View style={{ gap: 2 }}>
              <Text
                className="font-sf-semibold text-white"
                style={{
                  fontSize: 28,
                  lineHeight: 34,
                  letterSpacing: 0.25,
                }}
              >
                {copy.title}
              </Text>

              <Text
                className="font-sf-medium"
                style={{
                  fontSize: 18,
                  lineHeight: 24,
                  letterSpacing: 0.15,
                  color: HERO_TEXT,
                }}
              >
                {copy.subtitle}
              </Text>
            </View>
          </View>

          <Tray.Section
            scrollable
            maxHeightRatio={0.37}
            style={{ paddingVertical: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 28,
              paddingTop: 24,
              paddingBottom: 24,
              gap: 28,
            }}
          >
            <Text
              className="font-sf-medium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.18,
                color: BODY_TEXT,
              }}
            >
              {copy.intro}
            </Text>

            <View style={{ gap: 10 }}>
              <Text
                className="font-sf-semibold text-[#15161A]"
                style={{
                  fontSize: 21,
                  lineHeight: 30,
                  letterSpacing: 0.2,
                }}
              >
                {copy.firstSectionTitle}
              </Text>

              <Text
                className="font-sf-medium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.18,
                  color: BODY_TEXT,
                }}
              >
                {copy.firstSectionBody}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text
                className="font-sf-semibold text-[#15161A]"
                style={{
                  fontSize: 21,
                  lineHeight: 30,
                  letterSpacing: 0.2,
                }}
              >
                {copy.secondSectionTitle}
              </Text>

              <Text
                className="font-sf-medium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.18,
                  color: BODY_TEXT,
                }}
              >
                {copy.secondSectionBody}
              </Text>
            </View>
          </Tray.Section>

          <View style={{ paddingHorizontal: 28, paddingBottom: 24 }}>
            <PrimaryButton
              label={copy.buttonLabel}
              onPress={close}
              backgroundColor={ACCENT}
            />
          </View>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

export const createCreatingWalletsInfoSteps = (
  copy?: CreatingWalletsInfoCopy,
): TrayStepDefinition[] => [
  {
    key: "creating-wallets-info",
    content: <CreatingWalletsInfoStep copy={copy} />,
    options: { className: "bg-white" },
  },
];

const CreatingWalletsInfoTray = () => {
  const steps = useMemo<TrayStepDefinition[]>(
    () => createCreatingWalletsInfoSteps(),
    [],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Creating Wallets" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default CreatingWalletsInfoTray;
