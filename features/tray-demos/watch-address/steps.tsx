import React, { useState } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { FieldShell } from "../shared/field-shell";
import { PrimaryButton } from "../shared/primary-button";
import { trayTextInputStyle } from "../shared/input-styles";
import {
  CreateWalletAvatarPicker,
  CreateWalletColorGrid,
  CreateWalletFlowFooter,
  CreateWalletFlowHeader,
  WalletActionRow,
} from "./components";
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
            autoFocus={false}
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
            className="font-sf-medium text-center text-[#B6BAC2]"
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
  const [walletName, setWalletName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#41BBFF");
  const [hasAvatar, setHasAvatar] = useState(false);

  return (
    <Tray.Pages>
      <Tray.Pages.Header>
        <CreateWalletFlowHeader />
      </Tray.Pages.Header>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <View style={{ gap: 18 }}>
            <Text
              className="font-sf-semibold text-[#2D2E30]"
              style={{
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: 0.2,
              }}
            >
              Name Your Wallet
            </Text>

            <Text
              className="font-sf-medium text-[#A0A4AA]"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.15,
              }}
            >
              Choose a nickname for your wallet.
            </Text>
          </View>

          <View style={{ paddingTop: 28 }}>
            <View
              style={{
                paddingBottom: 12,
              }}
            >
              <Tray.TextInput
                value={walletName}
                onChangeText={setWalletName}
                autoCapitalize="words"
                autoFocus={false}
                autoCorrect={false}
                autoComplete="off"
                placeholder="My New Wallet"
                placeholderTextColor="#D2D5DA"
                returnKeyType="done"
                smartInsertDelete={false}
                spellCheck={false}
                textContentType="none"
                style={trayTextInputStyle}
              />
            </View>
          </View>

          <Text
            className="font-sf-medium text-[#B2B6BC]"
            style={{
              fontSize: 16,
              lineHeight: 24,
              letterSpacing: 0.12,
              paddingTop: 22,
            }}
          >
            Your nickname is private and only visible to you
          </Text>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <View style={{ gap: 12, paddingTop: 18 }}>
            <Text
              className="font-sf-semibold text-[#2D2E30]"
              style={{
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: 0.2,
              }}
            >
              Choose a Color
            </Text>

            <Text
              className="font-sf-medium text-[#A0A4AA]"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.15,
              }}
            >
              Great. Now choose a color for your{"\n"}wallet, you can always
              edit this later.
            </Text>
          </View>

          <View style={{ paddingTop: 58 }}>
            <CreateWalletColorGrid
              selectedColor={selectedColor}
              onSelect={setSelectedColor}
            />
          </View>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <View style={{ gap: 12, paddingTop: 18 }}>
            <Text
              className="font-sf-semibold text-[#2D2E30]"
              style={{
                fontSize: 32,
                lineHeight: 34,
                letterSpacing: 0.2,
              }}
            >
              Set a Display Image
            </Text>

            <Text
              className="font-sf-medium text-[#A0A4AA]"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.15,
              }}
            >
              Finally, let's choose an avatar for your{"\n"}wallet. This is
              visible only to you.
            </Text>
          </View>

          <View style={{ flex: 1, justifyContent: "center", paddingBottom: 60 }}>
            <CreateWalletAvatarPicker
              selectedColor={selectedColor}
              selected={hasAvatar}
              onPress={() => setHasAvatar((current) => !current)}
            />
          </View>
        </Tray.Body>
      </Tray.Page>

      <Tray.Pages.Footer>
        <CreateWalletFlowFooter />
      </Tray.Pages.Footer>
    </Tray.Pages>
  );
};
