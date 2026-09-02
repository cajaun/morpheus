import { useState } from "react";
import { Tray, useTrayFlow } from "morpheus";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
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
        <ComposeSupportStep flow={selectedFlow} />
      </Tray.Step>
      <Tray.Step key={`help-attach-${selectedFlow}`}>
        <SupportFlowHeader title="Attach Media" />
        <AttachMediaStep flow={selectedFlow} />
      </Tray.Step>
      <Tray.Step
        key={`help-details-${selectedFlow}`}
        options={{ keyboardAware: true }}
      >
        <SupportFlowHeader title="Your Details" />
        <YourDetailsStep />
      </Tray.Step>
    </Tray.Root>
  );
};

export default HelpSupportTray;
