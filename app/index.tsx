import React from "react";
import { TrayDemoSearchHome } from "@/features/tray-demos/search";
import { TRAY_EXAMPLE_VARIANTS } from "@/features/tray-demos/data";

export default function Index() {
  return <TrayDemoSearchHome data={TRAY_EXAMPLE_VARIANTS} />;
}
