import React from "react";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrayBackgroundScale } from "../../runtime/tray-background-scale";
import { useTrayAnimatedStyles } from "../animation/use-tray-animated-styles";
import { useTraySheetAnimatedStyles } from "../animation/use-tray-sheet-animated-styles";
import { useTrayBoundaryMotionState } from "../animation/use-tray-boundary-motion-state";
import {
  type TrayAnimatedStyles,
  type TrayBoundaryStyles,
  type TrayBoundaryMotionParams,
} from "./props";

export const TrayBoundaryMotionController = ({
  params,
  animatedStyleParams,
  prepared,
  children,
}: {
  params: TrayBoundaryMotionParams;
  animatedStyleParams: Parameters<typeof useTrayAnimatedStyles>[0];
  prepared: boolean;
  children: (
    styles: TrayBoundaryStyles,
    animatedStyles: TrayAnimatedStyles,
  ) => React.ReactNode;
}) => {
  const { top: safeAreaTopInset, bottom: safeAreaBottomInset } =
    useSafeAreaInsets();
  const animatedStyles = useTrayAnimatedStyles(
    animatedStyleParams,
    safeAreaBottomInset,
  );
  const providerBackgroundScale = useTrayBackgroundScale();
  const fallbackBackgroundScale = useSharedValue(1);
  // a prepared hidden host keeps its baseline out of the visible tray's scale until activation
  const backgroundScale =
    !prepared && providerBackgroundScale
      ? providerBackgroundScale
      : fallbackBackgroundScale;
  const styles = useTrayBoundaryMotionState({
    ...params,
    safeAreaTopInset,
    backgroundScale,
  });
  return children(styles, animatedStyles);
};

TrayBoundaryMotionController.displayName = "TrayBoundaryMotionController";

export const TraySheetAnimatedStyleController = ({
  params,
  children,
}: {
  params: Parameters<typeof useTrayAnimatedStyles>[0];
  children: (styles: TrayAnimatedStyles) => React.ReactNode;
}) => children(useTraySheetAnimatedStyles(params));

TraySheetAnimatedStyleController.displayName =
  "TraySheetAnimatedStyleController";

// fullscreen-capable, trigger-origin and active fullscreen trays keep this motion system mounted across step changes
export const TrayBoundaryMotionRegion = ({
  enabled,
  params,
  animatedStyleParams,
  prepared,
  children,
}: {
  enabled: boolean;
  params: TrayBoundaryMotionParams;
  animatedStyleParams: Parameters<typeof useTrayAnimatedStyles>[0];
  prepared: boolean;
  children: (
    boundaryStyles: TrayBoundaryStyles | null,
    animatedStyles: TrayAnimatedStyles,
  ) => React.ReactNode;
}) =>
  enabled ? (
    <TrayBoundaryMotionController
      params={params}
      animatedStyleParams={animatedStyleParams}
      prepared={prepared}
    >
      {children}
    </TrayBoundaryMotionController>
  ) : (
    <TraySheetAnimatedStyleController params={animatedStyleParams}>
      {(animatedStyles) => children(null, animatedStyles)}
    </TraySheetAnimatedStyleController>
  );

TrayBoundaryMotionRegion.displayName = "TrayBoundaryMotionRegion";
