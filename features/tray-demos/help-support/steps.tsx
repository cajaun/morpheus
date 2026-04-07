import React, { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { FieldShell } from "../shared/field-shell";
import { PrimaryButton } from "../shared/primary-button";
import { trayTextInputStyle } from "../shared/input-styles";
import { AREA_OPTIONS, flowAttachmentCopy, HELP_OPTIONS } from "./constants";
import { AreaRow, HelpCard } from "./components";
import type { HelpKind } from "./types";

export const SupportChooserStep = ({
  onSelect,
}: {
  onSelect: (nextFlow: HelpKind) => void;
}) => {
  const { close, next, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
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

export const ChooseAreasStep = () => {
  const { back, next, close, index } = useTrayFlow();
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

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
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
          <PrimaryButton
            label="Continue"
            onPress={next}
            disabled={selectedAreas.length === 0}
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

export const ComposeSupportStep = ({ flow }: { flow: HelpKind }) => {
  const { back, next, close, index } = useTrayFlow();
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
        <FlowHeader
          step={index}
          leftLabel={flowCopy.title}
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 16 }}>
        <FieldShell>
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
            style={{ ...trayTextInputStyle, height: 28 }}
          />
        </FieldShell>

        <FieldShell style={{ minHeight: 170 }}>
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
            style={{ ...trayTextInputStyle, minHeight: 142 }}
          />
        </FieldShell>

        <View style={{ paddingTop: 4 }}>
          <PrimaryButton
            label="Continue"
            onPress={next}
            disabled={!canContinue}
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

export const AttachMediaStep = ({ flow }: { flow: HelpKind }) => {
  const { back, next, close, index } = useTrayFlow();
  const helperCopy = flowAttachmentCopy[flow];

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
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
          <PrimaryButton label="Continue" onPress={next} />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

export const YourDetailsStep = () => {
  const { back, close, index } = useTrayFlow();
  const [name, setName] = useState("Test");
  const [email, setEmail] = useState("valmiera.com");

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Your Details"
          shouldClose
          onClose={close}
          onBack={back}
        />
      </Tray.Header>

      <Tray.Section style={{ gap: 16 }}>
        <Text
          className="font-sfMedium text-[#B9BDC2]"
          style={trayDemoText.bodyLarge}
        >
          Please let us know your email so we can follow up if we need to.
        </Text>

        <FieldShell>
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
            style={{ ...trayTextInputStyle, height: 28 }}
          />
        </FieldShell>

        <FieldShell>
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
            style={{ ...trayTextInputStyle, height: 28 }}
          />
        </FieldShell>

        <FieldShell
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            className="font-sfMedium text-[#101318]"
            style={trayDemoText.bodyLarge}
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
              style={trayDemoText.bodyLarge}
            >
              valmiera
            </Text>
          </View>
        </FieldShell>

        <View style={{ paddingTop: 4 }}>
          <PrimaryButton label="Continue to Submit" onPress={close} />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};
