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
        options: { className: "bg-white" },
      },
      {
        key: `help-attach-${selectedFlow}`,
        content: <AttachMediaStep flow={selectedFlow} />,
        options: { className: "bg-white" },
      },
      {
        key: `help-details-${selectedFlow}`,
        content: <YourDetailsStep />,
        options: { className: "bg-white" },
      },
    ],
    [selectedFlow],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger>
        <ExampleTrigger label="Help" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default HelpSupportTray;
