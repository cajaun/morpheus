import { useState } from "react";
import { Tray } from "react-native-morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import { OnboardingPageHeader } from "../shared/onboarding-page-header";
import {
  AddExistingWalletStep,
  CreateNewWalletStep,
  WatchAddressChooserStep,
  WatchAddressHeader,
  WatchAddressInputStep,
} from "./steps";
import type { WalletAction } from "./types";

const FULL_SCREEN_STEP_OPTIONS = {
  fullScreen: true,
  shouldScaleBackground: true,
  fullScreenSafeAreaTop: true,
  fullScreenDraggable: false,
  fullScreenCloseBehavior: "returnToShell",
} as const;

const STEP_OPTIONS = {
  create: { ...FULL_SCREEN_STEP_OPTIONS, keyboardAware: true },
  existing: FULL_SCREEN_STEP_OPTIONS,
  watch: { keyboardAware: true },
} as const;

const NextStep = ({ action }: { action: WalletAction }) => {
  switch (action) {
    case "create":
      return <CreateNewWalletStep />;
    case "existing":
      return <AddExistingWalletStep />;
    case "watch":
      return <WatchAddressInputStep />;
  }
};

const NextStepHeader = ({ action }: { action: WalletAction }) => {
  switch (action) {
    case "create":
      return <OnboardingPageHeader />;
    case "existing":
      return <OnboardingPageHeader showProgress={false} />;
    case "watch":
      return <WatchAddressHeader title="Watch Address" showBack />;
  }
};

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
        key={`watch-address-${selectedAction}`}
        options={STEP_OPTIONS[selectedAction]}
      >
        <NextStepHeader action={selectedAction} />
        <NextStep action={selectedAction} />
      </Tray.Step>
    </Tray.Root>
  );
};

export default WatchAddressTray;
