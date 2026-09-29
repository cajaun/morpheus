import { useState } from "react";
import { SymbolView } from "expo-symbols";
import { Text } from "react-native";
import { Tray, useTrayFlow } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AttachMediaStep,
  ChooseAreasStep,
  ComposeSupportStep,
  SupportChooserStep,
  YourDetailsStep,
} from "./steps";
import type { HelpKind } from "./types";

const SupportFlowHeader = ({ title }: { title: string }) => {
  const { close, back, index } = useTrayFlow();
  const returnButton =
    index > 0 ? (
      <Tray.HeaderCloseButton onPress={back}>
        <SymbolView
          name="chevron.left"
          type="palette"
          tintColor="#787878"
          size={TRAY_HEADER_CLOSE_ICON_SIZE}
          weight="semibold"
        />
      </Tray.HeaderCloseButton>
    ) : undefined;

  return (
    <Tray.Header withSeparator returnButton={returnButton}>
      <Tray.HeaderRow>
        <Text className="font-medium" style={trayDemoText.Title1}>
          {title}
        </Text>
        <Tray.HeaderCloseButton onPress={close}>
          <SymbolView
            name="xmark"
            type="palette"
            tintColor="#787878"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            weight="bold"
          />
        </Tray.HeaderCloseButton>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const HelpSupportTray = () => {
  const [selectedFlow, setSelectedFlow] = useState<HelpKind>("bug");
  return (
    <Tray.Root stepOptions={{ className: "bg-white" }}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Help" />
      </Tray.Trigger>
      <Tray.Step key="help-entry">
        <SupportFlowHeader title="How can we help?" />
        <SupportChooserStep onSelect={setSelectedFlow} />
      </Tray.Step>
      <Tray.Step key="help-areas">
        <SupportFlowHeader title="Choose Areas" />
        <ChooseAreasStep />
      </Tray.Step>
      <Tray.Step key={`help-compose-${selectedFlow}`} options={{ keyboardAware: true }}>
        <SupportFlowHeader
          title={
            selectedFlow === "feedback"
              ? "Share Feedback"
              : selectedFlow === "other"
                ? "Something Else"
                : "Report a Bug"
          }
        />
        <ComposeSupportStep flow={selectedFlow} />
      </Tray.Step>
      <Tray.Step key={`help-attach-${selectedFlow}`}>
        <SupportFlowHeader title="Attach Media" />
        <AttachMediaStep flow={selectedFlow} />
      </Tray.Step>
      <Tray.Step key={`help-details-${selectedFlow}`} options={{ keyboardAware: true }}>
        <SupportFlowHeader title="Your Details" />
        <YourDetailsStep />
      </Tray.Step>
    </Tray.Root>
  );
};

export default HelpSupportTray;
