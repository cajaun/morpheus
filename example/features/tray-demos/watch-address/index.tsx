import { useState } from "react";
import { Tray } from "morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AddExistingWalletStep,
  CreateNewWalletStep,
  WatchAddressHeader,
  WatchAddressChooserStep,
  WatchAddressInputStep,
} from "./steps";
import type { WalletAction } from "./types";

const WatchAddressTray = () => {
  const [selectedAction, setSelectedAction] = useState<WalletAction>("watch");
  return (
    <Tray.Root stepOptions={{ className: "bg-white" }}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Watch Address" />
      </Tray.Trigger>
      <Tray.Step key="watch-address-entry">
        <WatchAddressHeader title="New Wallet" />
        <WatchAddressChooserStep onSelectAction={setSelectedAction} />
      </Tray.Step>
      <Tray.Step
        key={`watch-address-next-${selectedAction}`}
        options={{
          keyboardAware: selectedAction === "watch",
          fullScreen: selectedAction !== "watch",
          shouldScaleBackground: selectedAction !== "watch",
          fullScreenSafeAreaTop: selectedAction !== "watch",
          fullScreenDraggable: selectedAction === "watch",
          fullScreenCloseBehavior:
            selectedAction !== "watch" ? "returnToShell" : "dismiss",
        }}
      >
        {selectedAction === "watch" ? (
          <WatchAddressHeader title="Watch Address" showBack />
        ) : null}
        {selectedAction === "create" ? (
          <CreateNewWalletStep />
        ) : selectedAction === "existing" ? (
          <AddExistingWalletStep />
        ) : (
          <WatchAddressInputStep />
        )}
      </Tray.Step>
    </Tray.Root>
  );
};

export default WatchAddressTray;
