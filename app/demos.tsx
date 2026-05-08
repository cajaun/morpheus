import React from "react";
import { useLocalSearchParams } from "expo-router";
import ActionTrayExamples from "@/features/tray-demos";

export default function Demos() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  return <ActionTrayExamples initialVariantValue={demo} />;
}
