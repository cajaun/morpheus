import React from "react";
import { View } from "react-native";
import ActionTrayExamples from "@/features/tray-demos";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActionTrayExamples />
    </View>
  );
}
