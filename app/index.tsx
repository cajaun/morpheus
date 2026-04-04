import React from "react";
import ActionTrayExamples from "@/components/action-tray/examples/examples";
import { View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <ActionTrayExamples />
    </View>
  );
}
