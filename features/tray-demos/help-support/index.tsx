import React, { useMemo, useState } from "react";
import { Tray, type TrayStepDefinition } from "@/features/action-tray";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AttachMediaStep,
  ChooseAreasStep,
  ComposeSupportStep,
  SupportChooserStep,
  YourDetailsStep,
} from "./steps";
import type { HelpKind } from "./types";

const HelpSupportTray = () => {
  const [selectedFlow, setSelectedFlow] = useState<HelpKind>("bug");
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "help-entry",
        content: <SupportChooserStep onSelect={setSelectedFlow} />,
        options: { className: "bg-white" },
      },
      {
        key: "help-areas",
        content: <ChooseAreasStep />,
        options: { className: "bg-white" },
      },
      {
        key: `help-compose-${selectedFlow}`,
        content: <ComposeSupportStep flow={selectedFlow} />,
        options: { className: "bg-white", keyboardAware: true },
      },
      {
        key: `help-attach-${selectedFlow}`,
        content: <AttachMediaStep flow={selectedFlow} />,
        options: { className: "bg-white" },
      },
      {
        key: `help-details-${selectedFlow}`,
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
