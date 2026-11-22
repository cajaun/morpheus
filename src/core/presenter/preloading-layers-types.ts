import React from "react";
import type { ResolvedTrayStepOptions } from "../../runtime/types";

export type PreloadingContentCurrentStep = {
  trayId: string;
  content: React.ReactNode;
  stepOptions: ResolvedTrayStepOptions;
  fullScreen: boolean;
  fullScreenBoundaryExit: boolean;
  isFirstRender: boolean;
};
