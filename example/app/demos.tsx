import React from "react";
import { useLocalSearchParams } from "expo-router";
import TrayExamples from "@/features/tray-demos";

export default function Demos() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  return <TrayExamples initialVariantValue={demo} />;
}
