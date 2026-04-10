import React from "react";
import { View } from "react-native";
import AboutAaveTray from "./about-aave";
import HelpSupportTray from "./help-support";
import IdentityRateBoostTray from "./identity-rate-boost";
import OnboardingExample from "./onboarding";
import PayFromTray from "./pay-from";
import Send from "./send";
import WalletGroupTray from "./wallet-group";
import WatchAddressTray from "./watch-address";
import WatchingWalletsInfoTray from "./watching-wallets-info";

const ActionTrayExamples = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
      }}
    >
      <OnboardingExample />
      <PayFromTray />
      <Send />
      <WatchAddressTray />
      <HelpSupportTray />
      <WatchingWalletsInfoTray />
      <AboutAaveTray />
      <IdentityRateBoostTray />
      <WalletGroupTray />
    </View>
  );
};

export default ActionTrayExamples;
