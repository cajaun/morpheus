import React from "react";
import { View, Text } from "react-native";
import OnboardingExample from "./onboarding-example";
import PayFromTray from "./new-wallet";

const ActionTrayExamples = () => {
  return (
    <View
      style={{
          flex: 1,
          flexDirection: "row",
gap: 16,
    justifyContent: "center",
    alignItems: "center",

      }}
    >
      <OnboardingExample />

      <PayFromTray />

      {/* <PostExample/> */}
    </View>
  );
};

export default ActionTrayExamples;
