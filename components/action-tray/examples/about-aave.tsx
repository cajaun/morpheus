import React from "react";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "../content/header";

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

const InsightBars = () => {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      {[18, 26, 34, 46].map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={{
            width: 10,
            height,
            borderRadius: 999,
            backgroundColor:
              index === 3 ? "#8B87FF" : index === 2 ? "#C6C2FF" : "#E4E2FF",
          }}
        />
      ))}
    </View>
  );
};

const LockedPill = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#9B95FF",
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <SymbolView
        name="lock.fill"
        tintColor="#9B95FF"
        size={22}
        weight="bold"
      />
      <Text
        className="font-sfBold text-[#8B87FF]"
        style={{
          fontSize: 18,
          lineHeight: 22,
          letterSpacing: 0.2,
        }}
      >
        Up to $1M
      </Text>
    </View>
  );
};

const PeopleCheck = () => {
  return (
    <View
      style={{
        width: 76,
        height: 54,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SymbolView
        name="person.2.circle.fill"
        tintColor="#DCD8FF"
        size={52}
        weight="regular"
      />

      <View
        style={{
          position: "absolute",
          right: 4,
          bottom: 1,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: "#8B87FF",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "#FFFFFF",
        }}
      >
        <SymbolView
          name="checkmark"
          tintColor="#FFFFFF"
          size={16}
          weight="bold"
        />
      </View>
    </View>
  );
};

const FeatureBlock = ({
  icon,
  title,
  description,
  accessory,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accessory?: React.ReactNode;
}) => {
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      {icon}

      <View style={{ gap: 4, alignItems: "center" }}>
        <Text
          className="font-sfBold text-[#111111]"
          style={{
            fontSize: 23,
            lineHeight: 30,
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          {title}
        </Text>

        <Text
          className="font-sfMedium text-[#7D7D85]"
          style={{
            fontSize: 18,
            lineHeight: 28,
            letterSpacing: 0.15,
            textAlign: "center",
          }}
        >
          {description}
        </Text>
      </View>

      {accessory ? accessory : null}
    </View>
  );
};

const AboutAaveStep = () => {
  const { close } = useTray();

  return (
    <Tray.Body>
      <Tray.Header withSeparator >
        <Header
          step={0}
          leftLabel="About Aave"
          shouldClose
          onClose={close}
          titleWeight="bold"
        />
      </Tray.Header>

      <Tray.Section
        style={{ gap: 40, paddingVertical: 40, paddingHorizontal: 12 }}
      >
        <FeatureBlock
          icon={<InsightBars />}
          title="Grow your balance faster."
          description="Earn with rates 30x higher than traditional savings accounts."
        />

        <FeatureBlock
          icon={<LockedPill />}
          title="  Your balance. Protected."
          description="     Secure your money with industry-leading balance protection."
        />

        <FeatureBlock
          icon={<PeopleCheck />}
          title="Your money. Your way."
          description="No deposit fees and no minimums. Withdraw anytime."
        />
      </Tray.Section>
    </Tray.Body>
  );
};

const AboutAaveTray = () => {
  return (
    <Tray.Root>
      <Tray.Trigger>
        <ExampleTrigger label="About Aave" />
      </Tray.Trigger>

      <Tray.Content scale className="bg-white">
        <AboutAaveStep />
      </Tray.Content>
    </Tray.Root>
  );
};

export default AboutAaveTray;
