import type React from "react";
import type { TrayStepProps } from "./types";

// mark declarative step boundaries without adding a native view
export const TrayStep: React.FC<TrayStepProps> = () => null;

TrayStep.displayName = "TrayStep";
