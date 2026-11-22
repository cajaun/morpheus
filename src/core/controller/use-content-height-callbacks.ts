import { useCallback } from "react";
import type { SharedValue } from "react-native-reanimated";
import { log } from "../logger";
import { SCREEN_HEIGHT } from "../constants";
import {
  resolveBoundaryProgress,
  resolveFullscreenReturnHeaderPadding,
} from "../animation/frame-style-math";
import type { TrayTransitionContract } from "../../runtime/types";
import type { useTrayGeometryOwnership } from "./use-tray-geometry-ownership";
import type { useTrayPresentationState } from "./use-tray-presentation-state";

type GeometryRefs = ReturnType<typeof useTrayGeometryOwnership>["refs"];

// sheet content heights while a fullscreen boundary is entered or left
export const useContentHeightCallbacks = ({
  activeTransitionRef,
  renderedFullScreenRef,
  activeTrayIdRef,
  handleSheetFramePrepared,
  footerHeight,
  isEnteringFullScreen,
  resolveRenderedContentHeight,
  morphProgress,
  transitionContract,
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
  returningToSheetRef,
  hasRenderedHeader,
  trayId,
  visible,
  fullScreen,
  presentationFullScreen,
}: {
  activeTransitionRef: GeometryRefs["activeTransitionRef"];
  renderedFullScreenRef: GeometryRefs["renderedFullScreenRef"];
  activeTrayIdRef: GeometryRefs["activeTrayIdRef"];
  returningToSheetRef: GeometryRefs["returningToSheetRef"];
  handleSheetFramePrepared: ReturnType<
    typeof useTrayGeometryOwnership
  >["handlers"]["handleSheetFramePrepared"];
  footerHeight: SharedValue<number>;
  isEnteringFullScreen: boolean;
  resolveRenderedContentHeight: ReturnType<
    typeof useTrayPresentationState
  >["helpers"]["resolveRenderedContentHeight"];
  morphProgress: SharedValue<number>;
  transitionContract: TrayTransitionContract | null | undefined;
  transitionStartedGeneration: SharedValue<number>;
  transitionLayoutStartedGeneration: SharedValue<number>;
  transitionCompletedGeneration: SharedValue<number>;
  hasRenderedHeader: boolean;
  trayId: string | undefined;
  visible: boolean | undefined;
  fullScreen: boolean | undefined;
  presentationFullScreen: boolean;
}) => {
  const handleSheetContentHeightMeasured = useCallback(
    (resolvedHeight: number, measuredTrayId?: string) => {
      const activeTransition = activeTransitionRef.current;

      if (
        !activeTransition ||
        !activeTransition.fullScreenChanged ||
        activeTransition.to?.mode !== "sheet" ||
        renderedFullScreenRef.current ||
        activeTrayIdRef.current !== measuredTrayId ||
        !Number.isFinite(resolvedHeight) ||
        resolvedHeight <= 1
      ) {
        return;
      }

      const footer = footerHeight.value;
      handleSheetFramePrepared(
        resolvedHeight + footer,
        "target",
        resolvedHeight,
        measuredTrayId,
      );
    },
    [
      activeTrayIdRef,
      activeTransitionRef,
      handleSheetFramePrepared,
      footerHeight,
      renderedFullScreenRef,
    ],
  );

  const resolveMeasuredContentHeight = useCallback(
    (measuredHeight: number) => {
      if (!isEnteringFullScreen) {
        const resolvedHeight = resolveRenderedContentHeight(measuredHeight);

        // remove the fullscreen header gap before caching the return frame so it never becomes sheet geometry
        const returningHeaderPadding = resolveFullscreenReturnHeaderPadding({
          progress: resolveBoundaryProgress(
            morphProgress.value,
            transitionContract?.generation,
            transitionStartedGeneration.value,
            transitionLayoutStartedGeneration.value,
            transitionCompletedGeneration.value,
            transitionContract?.fullScreenChanged === true,
          ),
          returningToSheet:
            returningToSheetRef.current &&
            transitionContract?.fullScreenChanged === true &&
            transitionContract.to?.mode === "sheet",
          hasHeader: hasRenderedHeader,
        });
        const intrinsicSheetHeight = Math.max(
          0,
          resolvedHeight - returningHeaderPadding,
        );

        // sheet mode trusts the measured content and the footer policy
        log("RESOLVE CONTENT HEIGHT", {
          trayId,
          measuredHeight,
          resolvedHeight,
          returningHeaderPadding,
          intrinsicSheetHeight,
          visible,
          incomingFullScreen: !!fullScreen,
          renderedFullScreen: presentationFullScreen,
          isEnteringFullScreen,
          footerHeight: footerHeight.value,
          mode: "rendered-presentation",
        });

        return intrinsicSheetHeight;
      }

      const resolvedHeight = Math.max(0, SCREEN_HEIGHT - footerHeight.value);

      // entering fullscreen uses viewport math before the fullscreen content settles
      log("RESOLVE CONTENT HEIGHT", {
        trayId,
        measuredHeight,
        resolvedHeight,
        visible,
        incomingFullScreen: !!fullScreen,
        renderedFullScreen: presentationFullScreen,
        isEnteringFullScreen,
        footerHeight: footerHeight.value,
        mode: "entering-fullscreen",
      });

      return resolvedHeight;
    },
    [
      isEnteringFullScreen,
      fullScreen,
      morphProgress,
      hasRenderedHeader,
      resolveRenderedContentHeight,
      presentationFullScreen,
      returningToSheetRef,
      footerHeight,
      transitionCompletedGeneration,
      transitionContract,
      transitionLayoutStartedGeneration,
      transitionStartedGeneration,
      trayId,
      visible,
    ],
  );

  return { handleSheetContentHeightMeasured, resolveMeasuredContentHeight };
};
