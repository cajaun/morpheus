import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import Animated, { Easing, FadeIn, FadeOut } from "react-native-reanimated";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoRadius,
  trayDemoText,
} from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const fadeInFadeOut = {
  entering: FadeIn.duration(160).easing(Easing.out(Easing.quad)),
  exiting: FadeOut.duration(120).easing(Easing.in(Easing.quad)),
} as const;

const walletGroups = [
  {
    id: "group-2",
    name: "Wallet Group 2",
    walletCount: 2,
    swatches: ["#4A96FF", "#F9B938"],
  },
  {
    id: "group-1",
    name: "Wallet Group 1",
    walletCount: 3,
    swatches: ["#4A96FF", "#FF7A59", "#101318"],
  },
] as const;

const AVATAR_SIZE = 20;
const GAP = 4;

// 👇 This defines the TOTAL height (2 rows + gap + padding)
const CONTAINER_HEIGHT = AVATAR_SIZE * 2 + GAP + 12; // 12 = vertical padding

const WalletGroupAvatars = ({ swatches }: { swatches: readonly string[] }) => {
  const count = swatches.length;

  const renderAvatar = (swatch: string, index: number) => (
    <View
      key={`${swatch}-${index}`}
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: swatch,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#FFF",
          opacity: 0.9,
        }}
      />
    </View>
  );

  return (
    <View
      className="rounded-xl"
      style={{
        paddingHorizontal: 8,
        paddingVertical: 6,
        height: CONTAINER_HEIGHT,

        backgroundColor: "#F6F7F8",
        justifyContent: "center",
      }}
    >
      {count === 1 && (
        <View style={{ alignItems: "center" }}>
          {renderAvatar(swatches[0], 0)}
        </View>
      )}

      {count === 2 && (
        <View
          style={{
            flexDirection: "row",
            gap: GAP,
          }}
        >
          {swatches.map(renderAvatar)}
        </View>
      )}

      {count === 3 && (
        <View style={{ gap: GAP }}>
          <View style={{ flexDirection: "row", gap: GAP }}>
            {swatches.slice(0, 2).map(renderAvatar)}
          </View>
          {renderAvatar(swatches[2], 2)}
        </View>
      )}
    </View>
  );
};

const SelectionIndicator = ({ selected }: { selected: boolean }) => {
  if (selected) {
    return (
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: trayDemoColors.primaryAction,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView
          name="checkmark"
          type="palette"
          size={16}
          weight="bold"
          tintColor="#FFFFFF"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#E4E6EB",
        backgroundColor: "#FFFFFF",
      }}
    />
  );
};

const WalletGroupRow = ({
  name,
  walletCount,
  swatches,
  selected,
  onPress,
}: {
  name: string;
  walletCount: number;
  swatches: readonly string[];
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <PressableScale onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <WalletGroupAvatars swatches={swatches} />

          <View>
            <Text className="font-sf-semiBold" style={trayDemoText.bodyLarge}>
              {name}
            </Text>

            <Text
              className="font-sf-medium"
              style={{
                ...trayDemoText.body,
                color: trayDemoColors.mutedText,
              }}
            >
              {walletCount} Wallets
            </Text>
          </View>
        </View>

        <SelectionIndicator selected={selected} />
      </View>
    </PressableScale>
  );
};

const NewGroupRow = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 2,
      }}
    >
      <View
        className="rounded-xl"
        style={{
          width: 48,
          height: 48,

          borderWidth: 2,
          borderColor: "#ECECF1",
          borderStyle: "dashed",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FCFCFD",
        }}
      >
        <SymbolView
          name="plus"
          type="palette"
          size={20}
          weight="semibold"
          tintColor="#C8CBD2"
        />
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text className="font-sf-semiBold" style={trayDemoText.bodyLarge}>
            New Group
          </Text>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: "#F5F5F8",
            }}
          >
            <Text
              className="font-sf-semibold"
              style={{
                fontSize: 14,
                lineHeight: 16,
                letterSpacing: 0.12,
                color: "#A3A7AF",
              }}
            >
              Advanced
            </Text>
          </View>
        </View>

        <Text
          className="font-sf-medium"
          style={{
            ...trayDemoText.body,
            color: trayDemoColors.mutedText,
          }}
        >
          Additional Steps Required
        </Text>
      </View>
    </View>
  );
};

const ChooseWalletGroupStep = ({
  selectedGroupId,
  onSelectGroup,
}: {
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}) => {
  const { close, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Choose Wallet Group"
          shouldClose
          onClose={close}
          titleWeight="semibold"
        />
      </Tray.Header>

      <Tray.Section
        style={{
          gap: 18,
          paddingTop: 22,
          paddingBottom: 18,
        }}
      >
        {walletGroups.map((group) => (
          <WalletGroupRow
            key={group.id}
            name={group.name}
            walletCount={group.walletCount}
            swatches={group.swatches}
            selected={selectedGroupId === group.id}
            onPress={() => onSelectGroup(group.id)}
          />
        ))}
        <NewGroupRow />
      </Tray.Section>
    </Tray.Body>
  );
};

const CreateWalletGroupConfirmationStep = () => {
  const { back } = useTrayFlow();

  const handleClose = async () => {
    await Haptics.selectionAsync();
    back();
  };

  return (
    <Tray.Body>
      <Tray.Section
        style={{
          gap: 18,
          paddingTop: 26,
          paddingBottom: 18,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <SymbolView
            name="questionmark.circle"
            type="palette"
            size={50}
            weight="thin"
            tintColor="#8C9097"
          />

          <PressableScale
            onPress={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F5F5FA",
            }}
          >
            <SymbolView
              name="xmark"
              type="palette"
              size={16}
              weight="bold"
              tintColor="#949595"
            />
          </PressableScale>
        </View>

        <Text
          className="font-sf-semiBold "
          style={{ fontSize: 28, lineHeight: 34, letterSpacing: 0.3 }}
        >
          Are you sure?
        </Text>

        <Text
          className="font-sf-medium"
          style={{
            ...trayDemoText.bodyLarge,
            color: trayDemoColors.mutedText,
          }}
        >
          Creating a new wallet group means creating a new Secret Recovery
          Phrase. This means you'll have another wallet group you'll need to
          keep track of and back up safely.
        </Text>

        <Text
          className="font-sf-medium"
          style={{
            ...trayDemoText.bodyLarge,
            color: trayDemoColors.mutedText,
          }}
        >
          If you just want to create a new wallet address, you can do this under
          an existing group without creating an entirely new wallet group (aka
          Secret Recovery Phrase).
        </Text>

        <Text
          className="font-sf-medium"
          style={{
            ...trayDemoText.bodyLarge,
            color: trayDemoColors.mutedText,
          }}
        >
          If you are sure you want to create a new wallet group, tap{" "}
          <Text
            className="font-sf-semibold"
            style={{
              fontSize: 16,
              lineHeight: 20,
              letterSpacing: 0.12,
              color: "#8B8F98",
              backgroundColor: "#F7F7F9",
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              overflow: "hidden",
            }}
          >
            Continue
          </Text>{" "}
          below.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const WalletGroupFooter = () => {
  const { index, total, next, close } = useTrayFlow();
  const isLastStep = total > 0 && index === total - 1;
  const label = isLastStep ? "Continue" : "Next";

  const handlePress = async () => {
    await Haptics.selectionAsync();

    if (isLastStep) {
      close();
      return;
    }

    next();
  };

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <PressableScale
        onPress={handlePress}
        style={{
          width: "100%",
          height: 50,
          borderRadius: trayDemoRadius.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: trayDemoColors.primaryAction,
        }}
      >
        <View
          style={{
            minHeight: 28,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.Text
            key={label}
            entering={fadeInFadeOut.entering}
            exiting={fadeInFadeOut.exiting}
            className="font-sf-semibold text-white"
            style={trayDemoText.button}
          >
            {label}
          </Animated.Text>
        </View>
      </PressableScale>
    </Tray.Footer>
  );
};

const sharedStepOptions = {
  className: "bg-white",
  footerStyle: { backgroundColor: trayDemoColors.white },
} as const;

const WalletGroupTray = () => {
  const [selectedGroupId, setSelectedGroupId] = useState("group-2");

  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "choose-wallet-group",
        content: (
          <ChooseWalletGroupStep
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
          />
        ),
        options: sharedStepOptions,
      },
      {
        key: "confirm-new-wallet-group",
        content: <CreateWalletGroupConfirmationStep />,
        options: sharedStepOptions,
      },
    ],
    [selectedGroupId],
  );

  const footer = useMemo(() => <WalletGroupFooter />, []);

  return (
    <Tray.Root steps={steps} footer={footer}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Wallet Group" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default WalletGroupTray;
