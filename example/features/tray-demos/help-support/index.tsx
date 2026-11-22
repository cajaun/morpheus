import { type ReactNode, useState } from "react";
import { SymbolView } from "expo-symbols";
import { Text } from "react-native";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AttachMediaStep,
  ChooseAreasStep,
  ComposeSupportStep,
  SupportChooserStep,
  SupportFooterButton,
  YourDetailsStep,
} from "./steps";
import type { HelpKind } from "./types";

const SupportBackAction = () => {
  const { back } = useTrayNavigation();

  return (
    <Tray.HeaderButton onPress={back}>
      <SymbolView
        name="chevron.left"
        type="palette"
        tintColor="#787878"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
      />
    </Tray.HeaderButton>
  );
};

const SupportFlowHeader = ({
  title,
  left,
}: {
  title: string;
  left?: ReactNode;
}) => {
  const { back, close } = useTrayNavigation();

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={left}
        right={
          left == null ? (
            <Tray.HeaderButton onPress={back}>
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

// The steps after the chooser share one footer (same id): the Continue
// button stays on screen while those steps change, and only its label and
// enabled state follow the step. The chooser has no footer, so the button
// comes in with Choose Areas and leaves when going back to the chooser.
const HELP_FOOTER_ID = "help-continue";

const HelpSupportTray = () => {
  const [selectedFlow, setSelectedFlow] = useState<HelpKind>("bug");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const toggleArea = (areaKey: string) => {
    setSelectedAreas((current) =>
      current.includes(areaKey)
        ? current.filter((item) => item !== areaKey)
        : [...current, areaKey],
    );
  };
  const canSubmitMessage =
    subject.trim().length > 0 && details.trim().length > 0;

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
        <ChooseAreasStep
          selectedAreas={selectedAreas}
          onToggleArea={toggleArea}
        />
        <Tray.Footer id={HELP_FOOTER_ID} exit="withContent">
          <SupportFooterButton
            label="Continue"
            disabled={selectedAreas.length === 0}
          />
        </Tray.Footer>
      </Tray.Step>
      
      <Tray.Step
        key={`help-compose-${selectedFlow}`}
        options={{ keyboardAware: true }}
      >
        <SupportFlowHeader
          title={
            selectedFlow === "feedback"
              ? "Share Feedback"
              : selectedFlow === "other"
                ? "Something Else"
                : "Report a Bug"
          }
        />
        <ComposeSupportStep
          flow={selectedFlow}
          subject={subject}
          details={details}
          onChangeSubject={setSubject}
          onChangeDetails={setDetails}
        />
        <Tray.Footer id={HELP_FOOTER_ID}>
          <SupportFooterButton label="Continue" disabled={!canSubmitMessage} />
        </Tray.Footer>
      </Tray.Step>
      <Tray.Step key={`help-attach-${selectedFlow}`}>
        <SupportFlowHeader title="Attach Media" />
        <AttachMediaStep flow={selectedFlow} />
        <Tray.Footer id={HELP_FOOTER_ID}>
          <SupportFooterButton label="Continue" />
        </Tray.Footer>
      </Tray.Step>
      <Tray.Step
        key={`help-details-${selectedFlow}`}
        options={{ keyboardAware: true }}
      >
        <SupportFlowHeader title="Your Details" />
        <YourDetailsStep />
        <Tray.Footer id={HELP_FOOTER_ID}>
          <SupportFooterButton label="Continue to Submit" action="close" />
        </Tray.Footer>
      </Tray.Step>
    </Tray.Root>
  );
};

export default HelpSupportTray;
