import React, { useState } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "../content/header";

type WalletAction = "watch" | "create";

const WalletActionRow = ({
  icon,
  iconColor,
  label,
  description,
  onPress,
}: {
  icon: SFSymbol;
  iconColor: string;
  label: string;
  description: string;
  onPress?: () => void;
}) => {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 24,
        backgroundColor: "#F7F7F8",
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconColor,
        }}
      >
        <SymbolView name={icon} tintColor="#FFFFFF" size={22} weight="bold" />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          className="font-sfSemibold text-[#282828]"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>

        <Text
          className="font-sfMedium text-[#9FA4AA]"
          style={{
            fontSize: 18,
          }}
        >
          {description}
        </Text>
      </View>
    </PressableScale>
  );
};

const CreateNewHeader = ({ onClose }: { onClose: () => void }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 8,
      }}
    >
      <PressableScale onPress={onClose} style={{ width: 32, alignItems: "flex-start" }}>
        <SymbolView
          name="xmark"
          type="palette"
          size={22}
          weight="semibold"
          tintColor="#2A2A2C"
        />
      </PressableScale>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flex: 1,
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={{
              width: 24,
              height: 4,
              borderRadius: 999,
              backgroundColor: index === 0 ? "#41BBFF" : "#D8DADF",
            }}
          />
        ))}
      </View>

      <PressableScale
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#DCDDDF",
        }}
      >
        <SymbolView
          name="questionmark"
          type="palette"
          size={16}
          weight="semibold"
          tintColor="#5D6167"
        />
      </PressableScale>
    </View>
  );
};

const WatchAddressChooserStep = ({
  onSelectAction,
}: {
  onSelectAction: (action: WalletAction) => void;
}) => {
  const { close, next } = useTray();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header step={0} leftLabel="New Wallet" shouldClose onClose={close} />
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

const WatchAddressInputStep = () => {
  const { close, back } = useTray();
  const [address, setAddress] = useState("");
  const canContinue = address.trim().length > 0;

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={1}
          leftLabel="Watch Address"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 20 }}>
        <View
          style={{
            borderRadius: 20,
            backgroundColor: "#F5F5F7",
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
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
            placeholderTextColor="#B6BAC2"
            returnKeyType="done"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="none"
            style={{
              fontFamily: "Sf-medium",
              fontSize: 21,
              letterSpacing: 0.2,
              color: "#101318",
              height: 28,
              margin: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
          />
        </View>

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
        <PressableScale
          onPress={canContinue ? close : undefined}
          style={{
            backgroundColor: canContinue ? "#41BBFF" : "#BFE7FF",
            height: 50,
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
    </Tray.Body>
  );
};

const CreateNewWalletStep = ({
  fullScreen = false,
}: {
  fullScreen?: boolean;
}) => {
  const { close, back } = useTray();
  const [contact, setContact] = useState("");
  const canContinue = contact.trim().length > 0;

  return (
    <Tray.Body fullScreen={fullScreen} style={{ paddingHorizontal: 24 }}>
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
              style={{
                fontFamily: "Sf-medium",
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
                color: "#101318",
                margin: 0,
                paddingHorizontal: 0,
                paddingVertical: 0,
              }}
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
          <PressableScale
            onPress={canContinue ? close : undefined}
            style={{
              backgroundColor: canContinue ? "#41BBFF" : "#BFE7FF",
              height: 50,
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
      </View>
    </Tray.Body>
  );
};

const WatchAddressTray = () => {
  const [selectedAction, setSelectedAction] = useState<WalletAction>("watch");

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
          <Text className="text-2xl font-sfBold">Watch Address</Text>
        </PressableScale>
      </Tray.Trigger>

      <Tray.Content key="watch-address-entry" scale className="bg-white">
        <WatchAddressChooserStep onSelectAction={setSelectedAction} />
      </Tray.Content>

      <Tray.Content
        key={`watch-address-next-${selectedAction}`}
        scale
        fullScreen={selectedAction === "create"}
        className="bg-white"
      >
        {selectedAction === "create" ? (
          <CreateNewWalletStep />
        ) : (
          <WatchAddressInputStep />
        )}
      </Tray.Content>
    </Tray.Root>
  );
};

export default WatchAddressTray;
