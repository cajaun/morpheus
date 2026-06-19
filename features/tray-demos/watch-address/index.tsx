import React, { useMemo, useState } from "react";
import { Tray, type TrayStepDefinition } from "@/features/action-tray";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  CreateNewWalletStep,
  WatchAddressHeader,
  WatchAddressChooserStep,
  WatchAddressInputStep,
} from "./steps";
import { OnboardingPageHeader } from "../shared/onboarding-page-header";
import type { WalletAction } from "./types";

const WatchAddressTray = () => {
  const [selectedAction, setSelectedAction] = useState<WalletAction>("watch");
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "watch-address-entry",
        header: <WatchAddressHeader title="New Wallet" />,
        content: <WatchAddressChooserStep onSelectAction={setSelectedAction} />,
        options: { className: "bg-white" },
      },
      {
        key: `watch-address-next-${selectedAction}`,
        header:
          selectedAction === "create" ? (
            <OnboardingPageHeader />
          ) : (
            <WatchAddressHeader title="Watch Address" showBack />
          ),
        content:
          selectedAction === "create" ? (
            <CreateNewWalletStep />
          ) : (
            <WatchAddressInputStep />
          ),
        options: {
          className: "bg-white",
          keyboardAware: true,
          fullScreen: selectedAction === "create",
          fullScreenSafeAreaTop: selectedAction === "create",
          fullScreenDraggable: selectedAction !== "create",
          fullScreenCloseBehavior:
            selectedAction === "create" ? "returnToShell" : "dismiss",
        },
      },
    ],
    [selectedAction],
  );

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Watch Address" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default WatchAddressTray;
