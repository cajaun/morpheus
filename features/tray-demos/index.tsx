import React from "react";
import { View } from "react-native";
import AboutAaveTray from "./about-aave";
import { UsageVariantFlatList } from "./component-presentation/usage-variant-flatlist";
import type { UsageVariant } from "./component-presentation/types";
import CreatingWalletsInfoTray from "./creating-wallets-info";
import ExpandFromTriggerDemo from "./expand-from-trigger";
import HelpSupportTray from "./help-support";
import IdentityRateBoostTray from "./identity-rate-boost";
import OnboardingExample from "./onboarding";
import PayFromTray from "./pay-from";
import Send from "./send";
import WalletGroupTray from "./wallet-group";
import WatchAddressTray from "./watch-address";
import WatchingWalletsInfoTray from "./watching-wallets-info";

type TrayExampleFrameProps = {
  children: React.ReactNode;
};

const TrayExampleFrame = ({ children }: TrayExampleFrameProps) => (
  <View
    style={{
      alignItems: "center",
      backgroundColor: "#F5F5F5",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    }}
  >
    {children}
  </View>
);

const TRAY_EXAMPLE_VARIANTS: UsageVariant[] = [
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
    value: "pay-from",
    label: "Pay From",
    content: (
      <TrayExampleFrame>
        <PayFromTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "send",
    label: "Send",
    content: (
      <TrayExampleFrame>
        <Send />
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
    value: "creating-wallets",
    label: "Creating Wallets",
    content: (
      <TrayExampleFrame>
        <CreatingWalletsInfoTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "about-aave",
    label: "About Aave",
    content: (
      <TrayExampleFrame>
        <AboutAaveTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "identity-rate-boost",
    label: "Identity Boost",
    content: (
      <TrayExampleFrame>
        <IdentityRateBoostTray />
      </TrayExampleFrame>
    ),
  },
  {
    value: "expand-from-trigger",
    label: "Expand From Trigger",
    content: <ExpandFromTriggerDemo showBackLink={false} />,
  },
  {
    value: "wallet-group",
    label: "Wallet Group",
    content: (
      <TrayExampleFrame>
        <WalletGroupTray />
      </TrayExampleFrame>
    ),
  },
];

const ActionTrayExamples = () => (
  <UsageVariantFlatList data={TRAY_EXAMPLE_VARIANTS} />
);

export default ActionTrayExamples;
