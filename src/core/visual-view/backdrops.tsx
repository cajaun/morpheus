import React from "react";
import { useDerivedValue } from "react-native-reanimated";
import { Backdrop } from "../../primitives/backdrop";
import type { TrayController } from "../use-tray-controller";
import { TrayBackdropInteractionContext } from "./contexts";

export const TrayInteractionBackdrop = React.memo(
  ({
    isRendered,
    progress,
  }: {
    isRendered: boolean;
    progress: TrayController["shared"]["progress"];
  }) => {
    const interaction = React.useContext(TrayBackdropInteractionContext)!;

    return (
      <Backdrop
        onTap={interaction.onRequestClose}
        isRendered={isRendered}
        interactive={interaction.interactive}
        progress={progress}
      />
    );
  },
);

TrayInteractionBackdrop.displayName = "TrayInteractionBackdrop";

export const TrayOriginTransitionBackdrop = React.memo(
  ({
    isRendered,
    originProgress,
    progress,
  }: {
    isRendered: boolean;
    originProgress: TrayController["shared"]["originProgress"];
    progress: TrayController["shared"]["progress"];
  }) => {
    const backdropProgress = useDerivedValue(
      () => originProgress.value * progress.value,
    );

    return (
      <TrayInteractionBackdrop
        isRendered={isRendered}
        progress={backdropProgress}
      />
    );
  },
);

TrayOriginTransitionBackdrop.displayName = "TrayOriginTransitionBackdrop";
