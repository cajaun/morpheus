import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "morpheus";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
import { AnimatedOnboardingButton } from "@/features/tray-demos/presets/content/button";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const PRIMARY = "#09B6F4";
const SOFT_BLUE = "#DDF5FF";
const SOFT_SURFACE = "#F8F8FA";
const BORDER = "#E8E9EC";
const MUTED = "#9B9DA3";
const DARK = "#17181C";
const RED = "#FF3B4D";
const GREEN = "#22C766";

const DynamicHeightsFooter = () => {
  const { next, index, total, close, back } = useTrayFlow();
  const isFirstStep = index === 0;
  const isLastStep = index === total - 1;

  return (
    <Tray.Footer
      style={{ alignItems: "center", width: "100%", paddingBottom: 24 }}
    >
      <AnimatedOnboardingButton
        step={index}
        totalSteps={total}
        onNext={isLastStep ? close : next}
        onFinish={close}
        onSecondaryPress={isFirstStep ? close : back}
        showSecondary
        primaryColor={PRIMARY}
      />
    </Tray.Footer>
  );
};

const DynamicHeightsHeader = ({ title }: { title: string }) => {
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Header withSeparator>
      <FlowHeader
        step={index}
        leftLabel={title}
        shouldClose
        onClose={close}
        onBack={index > 0 ? back : undefined}
      />
    </Tray.Header>
  );
};

const VerifiedBanner = () => {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: SOFT_BLUE,
        borderRadius: 12,
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <SymbolView
        name="checkmark.seal.fill"
        tintColor={PRIMARY}
        size={20}
        weight="bold"
      />
      <Text
        className="font-sf-medium"
        style={{ color: PRIMARY, fontSize: 17, lineHeight: 22 }}
      >
        This domain has been verified.
      </Text>
    </View>
  );
};

const CurrencyMark = () => {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#111216",
        borderRadius: 9,
        height: 20,
        justifyContent: "center",
        width: 20,
      }}
    >
      <SymbolView
        name="diamond.fill"
        tintColor="#FFFFFF"
        size={12}
        weight="bold"
      />
    </View>
  );
};

const WalletChangeRow = ({
  direction,
  label,
  value,
}: {
  direction: "send" | "receive";
  label: string;
  value: string;
}) => {
  const isSend = direction === "send";

  return (
    <View style={{ alignItems: "center", flexDirection: "row", minHeight: 32 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: isSend ? RED : GREEN,
          borderRadius: 11,
          height: 22,
          justifyContent: "center",
          width: 22,
        }}
      >
        <SymbolView
          name={isSend ? "arrow.up" : "arrow.down"}
          tintColor="#FFFFFF"
          size={13}
          weight="bold"
        />
      </View>
      <Text
        className="font-sf-medium"
        style={{
          ...trayDemoText.bodyLarge,
          color: DARK,
          flex: 1,
          marginLeft: 12,
        }}
      >
        {label}
      </Text>
      <CurrencyMark />
      <Text
        className="font-sf-semibold"
        style={{
          ...trayDemoText.bodyLarge,
          color: isSend ? RED : "#12B65D",
          marginLeft: 8,
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const InfoLabel = ({ children }: { children: string }) => {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 7 }}>
      <Text
        className="font-sf-medium"
        style={{ color: MUTED, fontSize: 15, lineHeight: 20 }}
      >
        {children}
      </Text>
      <SymbolView
        name="info.circle"
        tintColor="#B4B6BB"
        size={14}
        weight="regular"
      />
    </View>
  );
};

const KeyValueRow = ({
  label,
  value,
  valueIcon,
  valueUnit,
  valuePrefix,
  infoIcon,
}: {
  label: string;
  value: string;
  valueIcon?: boolean;
  valueUnit?: string;
  valuePrefix?: string;
  infoIcon?: boolean;
}) => {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", minHeight: 30 }}>
      <View style={{ alignItems: "center", flex: 1, flexDirection: "row", gap: 7 }}>
        <Text
          className="font-sf-medium"
          style={{ ...trayDemoText.bodyLarge, color: MUTED }}
        >
          {label}
        </Text>
        {infoIcon ? (
          <View
            style={{ alignItems: "center", height: 24, justifyContent: "center", width: 18 }}
          >
            <SymbolView
              name="info.circle"
              tintColor="#B4B6BB"
              size={16}
              weight="regular"
            />
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: "center", flexDirection: "row" }}>
        {valueIcon ? <CurrencyMark /> : null}
        {valuePrefix ? (
          <Text
            className="font-sf-medium"
            style={{ ...trayDemoText.bodyLarge, color: MUTED, marginRight: 6 }}
          >
            {valuePrefix}
          </Text>
        ) : null}
        <Text
          className="font-sf-semibold"
          style={{
            ...trayDemoText.bodyLarge,
            color: DARK,
            marginLeft: valueIcon ? 8 : 0,
          }}
        >
          {value}
        </Text>
        {valueUnit ? (
          <Text
            className="font-sf-medium"
            style={{ ...trayDemoText.bodyLarge, color: MUTED, marginLeft: 6 }}
          >
            {valueUnit}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const SeeAllDivider = () => {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
      <View style={{ backgroundColor: "#F0F0F2", flex: 1, height: 1 }} />
      <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
        <Text
          className="font-sf-medium"
          style={{ color: MUTED, fontSize: 18, lineHeight: 24 }}
        >
          See All
        </Text>
        <SymbolView
          name="chevron.down"
          tintColor={MUTED}
          size={14}
          weight="semibold"
        />
      </View>
      <View style={{ backgroundColor: "#F0F0F2", flex: 1, height: 1 }} />
    </View>
  );
};

const RefuelGasBody = () => {
  return (
    <Tray.Body>
      <Tray.Section style={{ gap: 16, paddingTop: 20 }}>
        <VerifiedBanner />

        <View style={{ gap: 8 }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              className="font-sf-medium"
              style={{ color: MUTED, fontSize: 16, lineHeight: 22 }}
            >
              Estimated Wallet Changes
            </Text>
            <SymbolView
              name="questionmark.circle"
              tintColor="#B4B6BB"
              size={16}
              weight="regular"
            />
          </View>
          <WalletChangeRow
            direction="send"
            label="Send"
            value="- 0.01079 ETH"
          />
          <WalletChangeRow
            direction="receive"
            label="Receive"
            value="+ 0.003598 ETH"
          />
        </View>

        <SeeAllDivider />

        <View style={{ gap: 10 }}>
          <KeyValueRow label="Network" value="Ethereum" valueIcon />
          <KeyValueRow
            label="Fee Estimate"
            value="$1.82"
            valuePrefix="up to"
            infoIcon
          />
          <KeyValueRow label="Estimated Time" value="~45s" infoIcon />
        </View>
      </Tray.Section>
      <DynamicHeightsFooter />
    </Tray.Body>
  );
};

const PriceGauge = () => {
  const { next } = useTrayFlow();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: SOFT_SURFACE,
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 22,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Text
          className="font-sf-medium"
          style={{ color: DARK, fontSize: 18, lineHeight: 24 }}
        >
          Price Range
        </Text>
        <PressableScale
          onPress={next}
          style={{ alignItems: "center", height: 24, justifyContent: "center", width: 24 }}
        >
          <SymbolView
            name="info.circle"
            tintColor="#8D9096"
            size={19}
            weight="regular"
          />
        </PressableScale>
      </View>

      <View style={styles.gaugeViewport}>
        <View style={styles.gaugeArcViewport}>
          <View style={styles.gaugeTrack}>
            <LinearGradient
              colors={["#26C65D", "#C6D924", "#FFB70D", "#FF3E2D"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.gaugeCutout} />
          </View>
        </View>
        <View style={styles.gaugeLabels}>
          <View>
            <Text
              className="font-sf-semibold"
              style={{ color: DARK, fontSize: 18, lineHeight: 24 }}
            >
              $1.31
            </Text>
            <Text
              className="font-sf-medium"
              style={{ color: "#B6B8BD", fontSize: 14, lineHeight: 18 }}
            >
              0.00039335 ETH
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              className="font-sf-semibold"
              style={{ color: DARK, fontSize: 18, lineHeight: 24 }}
            >
              $1.82
            </Text>
            <Text
              className="font-sf-medium"
              style={{ color: "#B6B8BD", fontSize: 14, lineHeight: 18 }}
            >
              0.00054617 ETH
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeViewport: {
    width: "100%",
  },
  gaugeArcViewport: {
    alignSelf: "center",
    aspectRatio: 2,
    overflow: "hidden",
    width: "88%",
  },
  gaugeTrack: {
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
    width: "100%",
  },
  gaugeCutout: {
    backgroundColor: SOFT_SURFACE,
    borderRadius: 999,
    bottom: 10,
    left: 10,
    position: "absolute",
    right: 10,
    top: 10,
  },
  gaugeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    width: "100%",
  },
});

const FeeEstimateBody = () => {
  return (
    <Tray.Body style={{ paddingHorizontal: 20 }}>
      <Tray.Section style={{ gap: 18, paddingTop: 20 }}>
        <PriceGauge />
        <View style={{ gap: 12 }}>
          <KeyValueRow
            label="Base Fee"
            value="12.97"
            valueUnit="Gwei"
            infoIcon
          />
          <KeyValueRow
            label="Gas Tip"
            value="0.05"
            valueUnit="Gwei"
            infoIcon
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const PriceRangeBody = () => {
  return (
    <Tray.Body>
      <Tray.Section style={{ gap: 18, paddingTop: 20 }}>
        <Text
          className="font-sf-medium"
          style={{ ...trayDemoText.bodyLarge, color: MUTED }}
        >
          In the context of gas fees on the Ethereum network, the “Price Range”
          refers to the spectrum of gas prices that can be chosen to pay for a
          transaction.
        </Text>
        <Text
          className="font-sf-medium"
          style={{ ...trayDemoText.bodyLarge, color: MUTED }}
        >
          Selecting a higher price may result in a faster confirmation time,
          while a lower price may be more economical but slower. The range is
          influenced by current network demand and recent transaction costs.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const DynamicHeightsTray = () => {
  return (
    <Tray.Root
      stepOptions={{
        className: "bg-white",
        footerStyle: { backgroundColor: "#FFFFFF" },
      }}
      // footer={<DynamicHeightsFooter />}
    >
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Dynamic Heights" />
      </Tray.Trigger>

      <Tray.Step>
        <DynamicHeightsHeader title="Refuel Gas" />
        <RefuelGasBody />
      </Tray.Step>
      <Tray.Step>
        <DynamicHeightsHeader title="Fee Estimate" />
        <FeeEstimateBody />
      </Tray.Step>
      <Tray.Step>
        <DynamicHeightsHeader title="Price Range" />
        <PriceRangeBody />
      </Tray.Step>
    </Tray.Root>
  );
};

export default DynamicHeightsTray;
