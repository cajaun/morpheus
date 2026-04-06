import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import { Tray, useTrayPages } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedOnboardingButton } from "../content/button";

type SendAction = "send" | "swap";
const DOT_SIZE = 8;

const ActionRow = ({
  icon,
  iconBackgroundColor,
  label,
  description,
  onPress,
}: {
  icon: SFSymbol;
  iconBackgroundColor: string;
  label: string;
  description: string;
  onPress?: () => void;
}) => {
  return (
    <PressableScale
      className="flex-row items-center bg-[#0F0F0F] border border-[#161616] rounded-3xl p-4"
      onPress={onPress}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          backgroundColor: iconBackgroundColor,
        }}
      >
        <SymbolView name={icon} tintColor="#fff" weight="bold" />
      </View>

      <View className="flex-1">
        <Text
          className="font-sfMedium text-white"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>

        <Text
          className="text-[#94999F] font-sfMedium"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {description}
        </Text>
      </View>
    </PressableScale>
  );
};

const FullScreenActionHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className="text-white font-sfBold"
        style={{
          fontSize: 32,
          lineHeight: 40,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>

      <PressableScale onPress={onClose}>
        <SymbolView name="xmark" tintColor="#fff" size={30} weight="regular" />
      </PressableScale>
    </View>
  );
};

const ProgressDot = ({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) => {
  const isActive = useDerivedValue(() => {
    const distance = Math.abs(progress.value - index);
    return Math.max(1 - distance, 0);
  });

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isActive.value, [0, 1], [0.3, 1]),
    transform: [{ scale: interpolate(isActive.value, [0, 1], [1, 1.3]) }],
  }));

  return (
    <Animated.View
      className="rounded-full bg-white"
      style={[{ width: DOT_SIZE, height: DOT_SIZE }, dotStyle]}
    />
  );
};

const FlowProgressDots = () => {
  const { totalPages, progress } = useTrayPages();

  const dotIndexes = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index);
  }, [totalPages]);

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ gap: 8, paddingBottom: 14 }}
    >
      {dotIndexes.map((index) => (
        <ProgressDot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
};

const SendFlowHeader = () => {
  const { requestClose } = useTray();
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: top + 20,
        paddingHorizontal: 20,
        paddingBottom: 24,
      }}
    >
      <FullScreenActionHeader title="Send" onClose={requestClose} />
    </View>
  );
};

const SendFlowFooter = () => {
  const { close } = useTray();
  const { pageIndex, totalPages, nextPage, backPage } = useTrayPages();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
    className = "  items-center"
      style={{
        paddingBottom: bottom + 25,
      }}
    >
      <FlowProgressDots />

      <AnimatedOnboardingButton
        step={pageIndex}
        totalSteps={totalPages}
        onNext={nextPage}
        onSecondaryPress={backPage}
        onFinish={close}
      />
    </View>
  );
};

const SendDestinationPage = () => {
  const { nextPage } = useTrayPages();

  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <View className="gap-6">
          <View className="flex-row items-center bg-[#141414] rounded-2xl px-4 py-2">
            <Text
              className="text-[#6B6F76] flex-1 font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              To ENS or Address
            </Text>

            <PressableScale
              className="bg-[#2B2B2B] px-4 py-1 rounded-full"
              onPress={nextPage}
            >
              <Text
                className="text-white font-sfMedium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                Paste
              </Text>
            </PressableScale>
          </View>

          <PressableScale className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-[#111111] items-center justify-center">
              <SymbolView name="qrcode.viewfinder" tintColor="#9CA3AF" />
            </View>

            <View>
              <Text
                className="text-white font-sfMedium"
                style={{
                  fontSize: 21,
                  lineHeight: 28,
                  letterSpacing: 0.2,
                }}
              >
                Scan QR Code
              </Text>
              <Text
                className="text-[#6B6F76] font-sfMedium"
                style={{
                  fontSize: 18,
                }}
              >
                Tap to scan an address
              </Text>
            </View>
          </PressableScale>

          <View className="gap-6">
            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 18,
              }}
            >
              Your Wallets
            </Text>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-xl">😁</Text>
              </View>

              <View>
                <Text
                  className="text-white font-sfMedium"
                  style={{
                    fontSize: 21,
                    lineHeight: 28,
                    letterSpacing: 0.2,
                  }}
                >
                  Test
                </Text>
                <Text
                  className="text-[#6B6F76] font-sfMedium"
                  style={{
                    fontSize: 18,
                  }}
                >
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-[#1F2937]" />

              <View>
                <Text
                  className="text-white font-sfMedium"
                  style={{
                    fontSize: 21,
                    lineHeight: 28,
                    letterSpacing: 0.2,
                  }}
                >
                  valmiera
                </Text>
                <Text
                  className="text-[#6B6F76] font-sfMedium"
                  style={{
                    fontSize: 18,
                  }}
                >
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>
          </View>

          <View className="gap-6">
            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 18,
              }}
            >
              Watched Wallets
            </Text>

            <PressableScale className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-[#134E4A] items-center justify-center">
                <View className="w-6 h-6 bg-yellow-400 rounded-sm" />
              </View>

              <View>
                <Text
                  className="text-white font-sfMedium"
                  style={{
                    fontSize: 21,
                    lineHeight: 28,
                    letterSpacing: 0.2,
                  }}
                >
                  valmiera.eth
                </Text>
                <Text
                  className="text-[#6B6F76] font-sfMedium"
                  style={{
                    fontSize: 18,
                  }}
                >
                  No Previous Transactions
                </Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const SendAmountPage = () => {
  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section className="gap-6">
        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 18,
                lineHeight: 26,
                letterSpacing: 0.15,
              }}
            >
              This page exists so you can test the fullscreen slide flow from
              one page to the next.
            </Text>
          </View>

          <View
            style={{
              borderRadius: 32,
              backgroundColor: "#141414",
              paddingHorizontal: 20,
              paddingVertical: 24,
              gap: 8,
            }}
          >
            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 16,
                lineHeight: 22,
                letterSpacing: 0.12,
              }}
            >
              Amount
            </Text>

            <Text
              className="text-white font-sfBold"
              style={{
                fontSize: 40,
                lineHeight: 46,
                letterSpacing: 0.2,
              }}
            >
              0.00 ETH
            </Text>

            <Text
              className="text-[#6B6F76] font-sfMedium"
              style={{
                fontSize: 18,
                lineHeight: 24,
                letterSpacing: 0.15,
              }}
            >
              Choose an amount to continue your send flow.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {["25%", "50%", "Max"].map((label) => (
              <PressableScale
                key={label}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  backgroundColor: "#141414",
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  className="text-white font-sfSemibold"
                  style={{
                    fontSize: 18,
                    lineHeight: 24,
                    letterSpacing: 0.15,
                  }}
                >
                  {label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const Send = () => {
  const { next } = useTray();
  const [selectedAction, setSelectedAction] = useState<SendAction>("send");

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
          <Text className="text-2xl font-sfBold">Send</Text>
        </PressableScale>
      </Tray.Trigger>

      <Tray.Content key="send-entry" scale className="bg-black">
        <Tray.Body style={{ paddingHorizontal: 12 }}>
          <Tray.Section>
            <View className="gap-3">
              <ActionRow
                icon="paperplane.fill"
                iconBackgroundColor="#358EFF"
                label="Send"
                description="Send tokens or collectibles to any address or ENS username."
                onPress={() => {
                  setSelectedAction("send");
                  next();
                }}
              />

              <ActionRow
                icon="arrow.trianglehead.2.clockwise.rotate.90"
                iconBackgroundColor="#747483"
                label="Swap"
                description="Swap your tokens without ever leaving your wallet."
                onPress={() => {
                  setSelectedAction("swap");
                  next();
                }}
              />

              <ActionRow
                icon="arrow.down"
                iconBackgroundColor="#4BCF6C"
                label="Receive"
                description="Receive Ethereum based assets through your unique address."
              />
            </View>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      <Tray.Content
        key={`send-flow-${selectedAction}`}
        scale
        fullScreen
        fullScreenDraggable={false}
        fullScreenCloseBehavior="returnToShell"
        className="bg-black"
      >
        <Tray.Pages>
          <Tray.Pages.Header>
            <SendFlowHeader />
          </Tray.Pages.Header>

          <Tray.Page className="flex-1 gap-6">
            <Text
              className=" font-sfMedium text-white"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Another heading
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Page>

          <Tray.Page className="flex-1 gap-6">
            <Text
              className="font-sfMedium text-white"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Different heading
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Lorem ipsum dolor sit, amet consectetur adipisicing elit.
              Laboriosam consequatur, eaque impedit vero esse.
            </Text>
          </Tray.Page>

          <Tray.Page className="flex-1 gap-6">
            <Text
              className=" font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is a test
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Page>

          <Tray.Pages.Footer>
            <SendFlowFooter />
          </Tray.Pages.Footer>
        </Tray.Pages>
      </Tray.Content>
    </Tray.Root>
  );
};

export default Send;
