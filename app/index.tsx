import React from "react";
import { Link } from "expo-router";
import { Text, View } from "react-native";
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
      <Link
        href="/expand-from-trigger"
        style={{
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: "#222",
            fontFamily: "Sf-semibold",
            fontSize: 16,
          }}
        >
          Open expand-from-trigger demo
        </Text>
      </Link>
      <ActionTrayExamples />
    </View>
  );
}
