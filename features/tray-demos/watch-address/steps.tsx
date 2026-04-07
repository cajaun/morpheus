import React, { useState } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { FieldShell } from "../shared/field-shell";
import { PrimaryButton } from "../shared/primary-button";
import { trayTextInputStyle } from "../shared/input-styles";
import { CreateNewHeader, WalletActionRow } from "./components";
import type { WalletAction } from "./types";

export const WatchAddressChooserStep = ({
  onSelectAction,
}: {
  onSelectAction: (action: WalletAction) => void;
}) => {
  const { close, next, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="New Wallet"
          shouldClose
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section>
        <WalletActionRow
          icon="plus"
          iconColor="#3590FF"
          label="Create New"
          description="Create a fresh address with no previous history."
          onPress={() => {
            onSelectAction("create");
            next();
          }}
        />

        <WalletActionRow
          icon="arrow.clockwise"
          iconColor="#3DCA46"
          label="Add Existing"
          description="Add an existing wallet by importing or restoring."
        />

        <WalletActionRow
          icon="binoculars.fill"
          iconColor="#62778B"
          label="Watch"
          description="Keep track of a wallet using an address or ENS name."
          onPress={() => {
            onSelectAction("watch");
            next();
          }}
        />
      </Tray.Section>
    </Tray.Body>
  );
};

export const WatchAddressInputStep = () => {
  const { close, back, index } = useTrayFlow();
  const [address, setAddress] = useState("");
  const canContinue = address.trim().length > 0;

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Watch Address"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 20 }}>
        <FieldShell>
          <Tray.TextInput
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            autoComplete="off"
            clearButtonMode="while-editing"
            keyboardType="ascii-capable"
            placeholder="ENS or Address"
            placeholderTextColor={trayDemoColors.secondaryText}
            returnKeyType="done"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="none"
            style={{ ...trayTextInputStyle, height: 28 }}
          />
        </FieldShell>

        <View
          style={{
            minHeight: 90,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingHorizontal: 16,
          }}
        >
          <SymbolView
            name="binoculars.fill"
            tintColor="#D6DAE0"
            size={65}
            weight="regular"
          />

          <Text
            className="font-sfMedium text-center text-[#B6BAC2]"
            style={{
              fontSize: 20,
              lineHeight: 28,
              letterSpacing: 0.2,
            }}
          >
            Search or paste an address{"\n"}to start watching a wallet
          </Text>
        </View>
      </Tray.Section>

      <View style={{ paddingTop: 4, paddingBottom: 28, width: "100%" }}>
        <PrimaryButton
          label="Continue"
          onPress={close}
          disabled={!canContinue}
        />
      </View>
    </Tray.Body>
  );
};

export const CreateNewWalletStep = () => {
  const { close, back } = useTrayFlow();
  const [contact, setContact] = useState("");
  const canContinue = contact.trim().length > 0;

  return (
    <Tray.Body style={{ paddingHorizontal: 24 }}>
      <View style={{ gap: 42, flex: 1 }}>
        <CreateNewHeader onClose={back} />

        <View style={{ gap: 14 }}>
          <Text
            className="font-sfSemibold text-[#1B1C1F]"
            style={{
              fontSize: 22,
              lineHeight: 30,
              letterSpacing: 0.2,
            }}
          >
            Phone or Email
          </Text>

          <Text
            className="font-sfMedium text-[#9B9EA5]"
            style={{
              fontSize: 18,
              lineHeight: 28,
              letterSpacing: 0.15,
            }}
          >
            Enter your phone or email to{"\n"}continue.
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#E7E9EE",
              paddingBottom: 10,
            }}
          >
            <Tray.TextInput
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              autoComplete="off"
              keyboardType="email-address"
              placeholder="Phone or Email"
              placeholderTextColor="#CCD1D7"
              returnKeyType="done"
              smartInsertDelete={false}
              spellCheck={false}
              textContentType="emailAddress"
              style={trayTextInputStyle}
            />
          </View>

          <Text
            className="font-sfMedium text-[#B6BAC2]"
            style={{
              fontSize: 16,
              lineHeight: 24,
              letterSpacing: 0.15,
            }}
          >
            Your wallet will be backed up to Family's dedicated{"\n"}self-custody
            account.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: "#E8E9ED" }} />

          <Text
            className="font-sfMedium text-[#A5A7AD]"
            style={{
              fontSize: 18,
              lineHeight: 24,
              letterSpacing: 0.15,
            }}
          >
            or create manually
          </Text>

          <View style={{ flex: 1, height: 1, backgroundColor: "#E8E9ED" }} />
        </View>

        <View style={{ paddingBottom: 28, marginTop: "auto" }}>
          <PrimaryButton
            label="Continue"
            onPress={close}
            disabled={!canContinue}
          />
        </View>
      </View>
    </Tray.Body>
  );
};
