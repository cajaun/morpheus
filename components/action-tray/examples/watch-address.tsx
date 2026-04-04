import React, { useState } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "../content/header";

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

const WatchAddressChooserStep = () => {
  const { close, next } = useTray();

  return (
    <Tray.Body>
      <Tray.Header  withSeparator>
        <Header step={0} leftLabel="New Wallet" shouldClose onClose={close} />
      </Tray.Header>

    
      <Tray.Section>
        <WalletActionRow
          icon="plus"
          iconColor="#3590FF"
          label="Create New"
          description="Create a fresh address with no previous history."
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
          onPress={next}
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
      <Tray.Header  withSeparator>
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
         <View>
           <SymbolView
            name="binoculars.fill"
            tintColor="#D6DAE0"
            size={65}
            weight="regular"
          />

          
         </View>

         <View>
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

const WatchAddressTray = () => {
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

      <Tray.Content scale className="bg-white">
        <WatchAddressChooserStep />
      </Tray.Content>

      <Tray.Content scale className="bg-white">
        <WatchAddressInputStep />
      </Tray.Content>
    </Tray.Root>
  );
};

export default WatchAddressTray;
