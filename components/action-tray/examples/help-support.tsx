import React, { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Tray } from "@/components/action-tray";
import { useTray } from "@/components/action-tray/context/context";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "../content/header";

type HelpKind = "bug" | "feedback" | "other";

const HELP_OPTIONS: Array<{
  key: HelpKind;
  label: string;
  description: string;
  icon: SFSymbol;
  iconColor: string;
}> = [
  {
    key: "bug",
    label: "Report Bug",
    description: "Let us know about a specific issue you're experiencing",
    icon: "ladybug.fill",
    iconColor: "#FF7A1A",
  },
  {
    key: "feedback",
    label: "Share Feedback",
    description: "Let us know how to improve by providing some feedback",
    icon: "bubble.left.fill",
    iconColor: "#49A8FF",
  },
  {
    key: "other",
    label: "Something Else",
    description: "Request features, leave a nice comment, or anything else",
    icon: "list.bullet.rectangle.fill",
    iconColor: "#16C2B2",
  },
];

const AREA_OPTIONS: Array<{ key: string; label: string; icon: SFSymbol }> = [
  { key: "send", label: "Send", icon: "paperplane" },
  { key: "swaps", label: "Swaps", icon: "arrow.2.circlepath" },
  { key: "activity", label: "Activity", icon: "waveform.path.ecg" },
  { key: "tokens", label: "Tokens", icon: "seal" },
  { key: "collectibles", label: "Collectibles", icon: "photo" },
  { key: "other", label: "Other", icon: "ellipsis.circle" },
];

const HelpCard = ({
  label,
  description,
  icon,
  iconColor,
  onPress,
}: {
  label: string;
  description: string;
  icon: SFSymbol;
  iconColor: string;
  onPress: () => void;
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

const PRIMARY_BUTTON_COLOR = "#41BBFF";

const flowAttachmentCopy: Record<HelpKind, string> = {
  bug:
    "If you'd like, upload any helpful screenshots or screen recordings. Do not include any private, sensitive or inappropriate imagery.",
  feedback:
    "If you'd like, upload any screenshots that help explain your feedback. Do not include any private, sensitive or inappropriate imagery.",
  other:
    "If you'd like, upload any screenshots or screen recordings that add more context. Do not include any private, sensitive or inappropriate imagery.",
};

const SupportPrimaryButton = ({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => {
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: disabled ? "#BFE7FF" : PRIMARY_BUTTON_COLOR,
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
        {label}
      </Text>
    </PressableScale>
  );
};

const AreaRow = ({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: SFSymbol;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 18,
        backgroundColor: selected ? "#F7F7F8" : "transparent",
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <SymbolView name={icon} tintColor="#B0B0B0" size={22} weight="medium" />
        <Text
          className="font-sfMedium text-[#2C2C2C]"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </View>

      {selected ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: PRIMARY_BUTTON_COLOR,
          }}
        >
          <SymbolView
            name="checkmark"
            tintColor="#FFFFFF"
            size={14}
            weight="bold"
          />
        </View>
      ) : null}
    </PressableScale>
  );
};

const fieldStyle = {
  borderRadius: 20,
  backgroundColor: "#F5F5F7",
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

const SupportChooserStep = ({
  onSelect,
}: {
  onSelect: (nextFlow: HelpKind) => void;
}) => {
  const { close, next } = useTray();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={0}
          leftLabel="How can we help?"
          shouldClose
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 12 }}>
        {HELP_OPTIONS.map((option) => (
          <HelpCard
            key={option.key}
            label={option.label}
            description={option.description}
            icon={option.icon}
            iconColor={option.iconColor}
            onPress={() => {
              onSelect(option.key);
              next();
            }}
          />
        ))}
      </Tray.Section>
    </Tray.Body>
  );
};

const ChooseAreasStep = () => {
  const { back, next, close } = useTray();
  const [selectedAreas, setSelectedAreas] = useState<string[]>(() =>
    AREA_OPTIONS.map((area) => area.key),
  );

  const toggleArea = (areaKey: string) => {
    setSelectedAreas((current) =>
      current.includes(areaKey)
        ? current.filter((item) => item !== areaKey)
        : [...current, areaKey],
    );
  };

  const canContinue = selectedAreas.length > 0;

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={1}
          leftLabel="Choose Areas"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          {AREA_OPTIONS.map((area) => (
            <AreaRow
              key={area.key}
              label={area.label}
              icon={area.icon}
              selected={selectedAreas.includes(area.key)}
              onPress={() => toggleArea(area.key)}
            />
          ))}
        </View>

        <View>
          <SupportPrimaryButton
            label="Continue"
            onPress={next}
 
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const ComposeSupportStep = ({ flow }: { flow: HelpKind }) => {
  const { back, next, close } = useTray();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const flowCopy = useMemo(() => {
    switch (flow) {
      case "feedback":
        return {
          title: "Share Feedback",
          detailsPlaceholder:
            "Tell us what could be better or what's working well",
        };
      case "other":
        return {
          title: "Something Else",
          detailsPlaceholder:
            "Request features, leave a comment, or tell us anything else",
        };
      case "bug":
      default:
        return {
          title: "Report a Bug",
          detailsPlaceholder:
            "Describe the issue in more detail,\nincluding steps to reproduce",
        };
    }
  }, [flow]);

  const canContinue = subject.trim().length > 0 && details.trim().length > 0;

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={2}
          leftLabel={flowCopy.title}
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 16 }}>
        <View style={fieldStyle}>
          <Tray.TextInput
            value={subject}
            onChangeText={setSubject}
            autoCapitalize="sentences"
            autoCorrect={false}
            autoFocus
            autoComplete="off"
            clearButtonMode="while-editing"
            placeholder="Subject"
            placeholderTextColor="#C8CBD1"
            returnKeyType="next"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="none"
            style={{
              fontFamily: "Sf-medium",
              fontSize: 21,
              lineHeight: 28,
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
            ...fieldStyle,
            minHeight: 170,
          }}
        >
          <Tray.TextInput
            value={details}
            onChangeText={setDetails}
            autoCapitalize="sentences"
            autoCorrect={false}
            autoComplete="off"
            multiline
            placeholder={flowCopy.detailsPlaceholder}
            placeholderTextColor="#C8CBD1"
            smartInsertDelete={false}
            spellCheck={false}
            textAlignVertical="top"
            textContentType="none"
            style={{
              fontFamily: "Sf-medium",
              fontSize: 21,
              lineHeight: 28,
              letterSpacing: 0.2,
              color: "#101318",
              minHeight: 142,
              margin: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
          />
        </View>

        <View style={{ paddingTop: 4 }}>
          <SupportPrimaryButton
            label="Continue"
            onPress={next}
         
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const AttachMediaStep = ({ flow }: { flow: HelpKind }) => {
  const { back, next, close } = useTray();
  const helperCopy = useMemo(() => flowAttachmentCopy[flow], [flow]);

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={3}
          leftLabel="Attach Media"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 20 }}>
        <View
          style={{
            minHeight: 260,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#F0F1F4",
            backgroundColor: "#FCFCFD",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 28,
            paddingVertical: 32,
            gap: 18,
          }}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F6F7FA",
            }}
          >
            <SymbolView
              name="photo.badge.plus"
              tintColor="#E0E3E7"
              size={48}
              weight="medium"
            />
          </View>

          <Text
            className="font-sfMedium text-[#C9CDD2]"
            style={{
              fontSize: 18,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {helperCopy}
          </Text>
        </View>

        <View>
          <SupportPrimaryButton label="Continue" onPress={next} />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const YourDetailsStep = () => {
  const { back, close } = useTray();
  const [name, setName] = useState("Test");
  const [email, setEmail] = useState("valmiera.com");

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <Header
          step={4}
          leftLabel="Your Details"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 16 }}>
        <Text
          className="font-sfMedium text-[#B9BDC2]"
          style={{
            fontSize: 21,
            lineHeight: 28,
            letterSpacing: 0.2,
          }}
        >
          Please let us know your email so we can follow up if we need to.
        </Text>

        <View style={fieldStyle}>
          <Tray.TextInput
            value={name}
            autoFocus
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            clearButtonMode="while-editing"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="name"
            style={{
              fontFamily: "Sf-medium",
              fontSize: 21,
              lineHeight: 28,
              letterSpacing: 0.2,
              color: "#101318",
              height: 28,
              margin: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
          />
        </View>

        <View style={fieldStyle}>
          <Tray.TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="email-address"
            smartInsertDelete={false}
            spellCheck={false}
            textContentType="emailAddress"
            style={{
              fontFamily: "Sf-medium",
              fontSize: 21,
              lineHeight: 28,
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
            ...fieldStyle,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            className="font-sfMedium text-[#101318]"
            style={{
              fontSize: 21,
              lineHeight: 28,
              letterSpacing: 0.2,
            }}
          >
            Wallet
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Image
              source={{ uri: "https://i.pravatar.cc/80?img=12" }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
              }}
            />

            <Text
              className="font-sfMedium text-[#101318]"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              valmiera
            </Text>
          </View>
        </View>

        <View style={{ paddingTop: 4 }}>
          <SupportPrimaryButton label="Continue to Submit" onPress={close} />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const HelpSupportTray = () => {
  const [selectedFlow, setSelectedFlow] = useState<HelpKind>("bug");

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
          <Text className="text-2xl font-sfBold">Help</Text>
        </PressableScale>
      </Tray.Trigger>

      <Tray.Content key="help-entry" scale className="bg-white">
        <SupportChooserStep onSelect={setSelectedFlow} />
      </Tray.Content>

      <Tray.Content key="help-areas" scale className="bg-white">
        <ChooseAreasStep />
      </Tray.Content>

      <Tray.Content key={`help-compose-${selectedFlow}`} scale className="bg-white">
        <ComposeSupportStep flow={selectedFlow} />
      </Tray.Content>

      <Tray.Content key={`help-attach-${selectedFlow}`} scale className="bg-white">
        <AttachMediaStep flow={selectedFlow} />
      </Tray.Content>

      <Tray.Content key={`help-details-${selectedFlow}`} scale className="bg-white">
        <YourDetailsStep />
      </Tray.Content>
    </Tray.Root>
  );
};

export default HelpSupportTray;
