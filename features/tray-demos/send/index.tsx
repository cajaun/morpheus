import React, { useMemo, useState } from "react";
import { Tray, type TrayStepDefinition } from "@/features/action-tray";
import { ExampleTrigger } from "../shared/example-trigger";
import { SendEntryStep, SendFlowStep } from "./steps";
import type { SendAction } from "./types";

const Send = () => {
  const [selectedAction, setSelectedAction] = useState<SendAction>("send");
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "send-entry",
        content: <SendEntryStep onSelectAction={setSelectedAction} />,
        options: { className: "bg-black" },
      },
      {
        key: `send-flow-${selectedAction}`,
        content: <SendFlowStep selectedAction={selectedAction} />,
        options: {
          className: "bg-black",
          fullScreen: true,
          fullScreenDraggable: false,
          fullScreenCloseBehavior: "returnToShell",
        },
      },
    ],
    [selectedAction],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger>
        <ExampleTrigger label="Send" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default Send;
