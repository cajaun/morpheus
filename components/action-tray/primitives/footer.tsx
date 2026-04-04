import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { log } from "../core/logger";

export const TrayFooter: React.FC<{
  children: React.ReactNode;
  step?: number;
  total?: number;
  totalSteps?: number;
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, step, total, totalSteps, fullScreen }) => {
  useEffect(() => {
    log("TrayFooter props", {
      step,
      total,
      totalSteps,
      fullScreen,
    });
  }, [fullScreen, step, total, totalSteps]);

  return React.cloneElement(children as any, {
    step,
    total,
    totalSteps: totalSteps ?? total,
    fullScreen,
  });
};

TrayFooter.displayName = "TrayFooter";
