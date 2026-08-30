import { useState } from "react";
import { Tray } from "morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import { SendEntryStep, SendFlowStep } from "./steps";
import type { SendAction } from "./types";

const Send = () => {
  const [selectedAction, setSelectedAction] = useState<SendAction>("send");
  return (
    <Tray.Root stepOptions={{ className: "bg-black" }}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Send" />
      </Tray.Trigger>
      <Tray.Step key="send-entry">
        <SendEntryStep onSelectAction={setSelectedAction} />
      </Tray.Step>
      <Tray.Step
        key={`send-flow-${selectedAction}`}
        options={{
          fullScreen: true,
          fullScreenDraggable: false,
          fullScreenCloseBehavior: "returnToShell",
        }}
      >
        <SendFlowStep selectedAction={selectedAction} />
      </Tray.Step>
    </Tray.Root>
  );
};

export default Send;
