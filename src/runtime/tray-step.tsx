import type React from "react";
import type { TrayStepProps } from "./types";

// marks a declarative step boundary without a native view
export const TrayStep: React.FC<TrayStepProps> = () => null;

TrayStep.displayName = "TrayStep";
