import React from "react";
import { View } from "react-native";
import AddStablecoinsTray from "./add-stablecoins";
import AddPaymentMethodTray from "./add-payment-method";
import AddPaymentMethodKeyboardTray from "./add-payment-method-keyboard";
import ChangeAvatarTray from "./change-avatar";
import type { UsageVariant } from "./component-presentation/types";
import EqualHeightsTray from "./equal-heights";
import FooterStepsTray from "./step-footers/four-steps";
import FooterEqualHeightsTray from "./step-footers/equal-heights";
import FooterFullScreenTray from "./step-footers/fullscreen";
import ExpandFromTriggerDemo from "./expand-from-trigger";
import HelpSupportTray from "./help-support";
import AaveExample from "./aave-tray";
import NotificationsTray from "./notifications";
import OnboardingExample from "./onboarding";
import RemoveWalletWarningTray from "./remove-wallet-warning";
import WatchAddressTray from "./watch-address";
import WatchingWalletsInfoTray from "./watching-wallets-info";
import { useTrayDemoTheme } from "./theme";

type TrayExampleFrameProps = {
  children: React.ReactNode;
};

const TrayExampleFrame = ({ children }: TrayExampleFrameProps) => {
  const theme = useTrayDemoTheme();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#FFFFFFF",
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      {children}
    </View>
  );
};

export const TRAY_EXAMPLE_VARIANTS: UsageVariant[] = [
  {
    value: "aave",
    label: "Aave",
    content: (
      <TrayExampleFrame>
        <AaveExample />
      </TrayExampleFrame>
    ),
  },
  {
    value: "add-stablecoins",
    label: "Add Stablecoins",
    content: (
      <TrayExampleFrame>
        <AddStablecoinsTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "notifications",
    label: "Notifications",
    content: (
      <TrayExampleFrame>
        <NotificationsTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "add-payment-method",
    label: "Add Payment Method",
    content: (
      <TrayExampleFrame>
        <AddPaymentMethodTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "add-payment-method-keyboard",
    label: "Add Payment Method Keyboard",
    content: (
      <TrayExampleFrame>
        <AddPaymentMethodKeyboardTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "change-avatar",
    label: "Change Avatar",
    content: (
      <TrayExampleFrame>
        <ChangeAvatarTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "equal-heights",
    label: "Equal Heights",
    content: (
      <TrayExampleFrame>
        <EqualHeightsTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "footer-steps",
    label: "Footer Steps",
    content: (
      <TrayExampleFrame>
        <FooterStepsTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "footer-equal-heights",
    label: "Footer Equal Heights",
    content: (
      <TrayExampleFrame>
        <FooterEqualHeightsTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "footer-fullscreen",
    label: "Footer Fullscreen",
    content: (
      <TrayExampleFrame>
        <FooterFullScreenTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "onboarding",
    label: "Onboarding",
    content: (
      <TrayExampleFrame>
        <OnboardingExample />
      </TrayExampleFrame>
    ),
  },
  {
    value: "watch-address",
    label: "Watch Address",
    content: (
      <TrayExampleFrame>
        <WatchAddressTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "help-support",
    label: "Help Support",
    content: (
      <TrayExampleFrame>
        <HelpSupportTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "watching-wallets",
    label: "Watching Wallets",
    content: (
      <TrayExampleFrame>
        <WatchingWalletsInfoTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "expand-from-trigger",
    label: "Expand From Trigger",
    content: <ExpandFromTriggerDemo showBackLink={false} />,
  },
  {
    value: "remove-wallet-warning",
    label: "Remove Wallet",
    content: <RemoveWalletWarningTray />,
  },
];
