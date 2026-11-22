import React, { useState } from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { FieldShell } from "../shared/field-shell";
import { PrimaryButton } from "../shared/primary-button";
import { trayTextInputStyle } from "../shared/input-styles";
import {
  CreateWalletAvatarPicker,
  CreateWalletColorGrid,
  CreateWalletFlowFooter,
  ExistingWalletHero,
  ExistingWalletOption,
  FamilyAccountIcon,
  WalletActionRow,
} from "./components";
import type { WalletAction } from "./types";

const PageTitle = ({ children }: { children: React.ReactNode }) => (
  <Text
    className="font-semibold text-[#2D2E30]"
    style={{ fontSize: 32, lineHeight: 34, letterSpacing: 0.2 }}
  >
    {children}
  </Text>
);

const PageSubtitle = ({ children }: { children: React.ReactNode }) => (
  <Text
    className="font-medium text-[#A0A4AA]"
    style={{ fontSize: 21, lineHeight: 28, letterSpacing: 0.15 }}
  >
    {children}
  </Text>
);

export const WatchAddressHeader = ({
  title,
  showBack = false,
}: {
  title: string;
  showBack?: boolean;
}) => {
  const { close, back } = useTrayNavigation();
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
        <Text className="font-medium" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

export const WatchAddressChooserStep = ({
  onSelectAction,
}: {
  onSelectAction: (action: WalletAction) => void;
}) => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
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
          onPress={() => {
            onSelectAction("existing");
            next();
          }}
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

export const AddExistingWalletStep = () => {
  return (
    <Tray.Pages>
      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 0, flex: 1 }}>
          <ExistingWalletHero />

          <View style={{ height: 1, backgroundColor: "#ECEDEF" }} />

          <Tray.Section
            style={{
              paddingHorizontal: 32,
              paddingTop: 24,
              gap: 16,
            }}
          >
            <View
              style={{
                width: "100%",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <Text
                className="font-semibold"
                style={{
                  fontSize: 28,
                  lineHeight: 36,
                  letterSpacing: 0.2,
                  color: "#2D2E30",
                  textAlign: "center",
                }}
              >
                Add an Existing Wallet
              </Text>
              <Text
                className="font-medium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.15,
                  color: "#A0A4AA",
                  textAlign: "center",
                }}
              >
                Continue using a wallet you already{"\n"}own by importing or
                restoring.
              </Text>
            </View>

            <ExistingWalletOption
              iconContent={<FamilyAccountIcon />}
              layout="stacked"
              title="Account"
              description="Add an existing wallet from your Family account."
              disabled
            />

            <ExistingWalletOption
              icon="arrow.down"
              iconBackground="#62778B"
              title="Import"
              description="Add an existing wallet via a Secret Phrase or Private Key."
            />

            <ExistingWalletOption
              icon="icloud.slash.fill"
              iconBackground="#D9DEE3"
              title="No Backup Found"
              description="Recover an existing wallet stored in your iCloud backup."
              disabled
            />
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>
    </Tray.Pages>
  );
};

export const WatchAddressInputStep = () => {
  const { close } = useTrayNavigation();
  const [address, setAddress] = useState("");
  const canContinue = address.trim().length > 0;

  return (
    <Tray.Body>
      <Tray.Section style={{ gap: 20 }}>
        <FieldShell>
          <Tray.TextInput
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
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
            className="font-medium text-center text-[#B6BAC2]"
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
      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Tray.Section style={{ gap: 0 }}>
            <View style={{ gap: 18 }}>
              <PageTitle>Name Your Wallet</PageTitle>

              <PageSubtitle>Choose a nickname for your wallet.</PageSubtitle>
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
              className="font-medium text-[#B2B6BC]"
              style={{
                fontSize: 16,
                lineHeight: 24,
                letterSpacing: 0.12,
                paddingTop: 22,
              }}
            >
              Your nickname is private and only visible to you
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Tray.Section style={{ gap: 0 }}>
            <View style={{ gap: 12 }}>
              <PageTitle>Choose a Color</PageTitle>

              <PageSubtitle>
                Great. Now choose a color for your{"\n"}wallet, you can always
                edit this later.
              </PageSubtitle>
            </View>

            <View style={{ paddingTop: 58 }}>
              <CreateWalletColorGrid
                selectedColor={selectedColor}
                onSelect={setSelectedColor}
              />
            </View>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Tray.Section style={{ gap: 0, flex: 1 }}>
            <View style={{ gap: 12 }}>
              <PageTitle>Set a Display Image</PageTitle>

              <PageSubtitle>
                Finally, let's choose an avatar for your{"\n"}wallet. This is
                visible only to you.
              </PageSubtitle>
            </View>

            <View
              style={{ flex: 1, justifyContent: "center", paddingBottom: 60 }}
            >
              <CreateWalletAvatarPicker
                selectedColor={selectedColor}
                selected={hasAvatar}
                onPress={() => setHasAvatar((current) => !current)}
              />
            </View>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Pages.Footer>
        <CreateWalletFlowFooter />
      </Tray.Pages.Footer>
    </Tray.Pages>
  );
};
