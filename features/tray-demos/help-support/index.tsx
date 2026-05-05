import React, { useMemo, useState } from "react";
import { Tray, useTrayFlow, type TrayStepDefinition } from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
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
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "help-entry",
        header: <SupportFlowHeader title="How can we help?" />,
        content: <SupportChooserStep onSelect={setSelectedFlow} />,
        options: { className: "bg-white" },
      },
      {
        key: "help-areas",
        header: <SupportFlowHeader title="Choose Areas" />,
        content: <ChooseAreasStep />,
        options: { className: "bg-white" },
      },
      {
        key: `help-compose-${selectedFlow}`,
        header: (
          <SupportFlowHeader
            title={
              selectedFlow === "feedback"
                ? "Share Feedback"
                : selectedFlow === "other"
                  ? "Something Else"
                  : "Report a Bug"
            }
          />
        ),
        content: <ComposeSupportStep flow={selectedFlow} />,
        options: { className: "bg-white", keyboardAware: true },
      },
      {
        key: `help-attach-${selectedFlow}`,
        header: <SupportFlowHeader title="Attach Media" />,
        content: <AttachMediaStep flow={selectedFlow} />,
        options: { className: "bg-white" },
      },
      {
        key: `help-details-${selectedFlow}`,
        header: <SupportFlowHeader title="Your Details" />,
        content: <YourDetailsStep />,
        options: { className: "bg-white", keyboardAware: true },
      },
    ],
    [selectedFlow],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Help" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default HelpSupportTray;
