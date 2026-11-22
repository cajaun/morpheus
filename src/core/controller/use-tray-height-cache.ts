import { useCallback, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import type {
  TrayMeasurementOwner,
  TrayPresentationMode,
} from "../../runtime/types";

type Params = {
  fullScreen?: boolean;
  contentHeight: SharedValue<number>;
  measurementOwner?: TrayMeasurementOwner;
};

// cached heights let tray swaps keep geometry between related presentations
export const useTrayHeightCache = ({
  fullScreen,
  contentHeight,
  measurementOwner,
}: Params) => {
  const contentHeightCacheRef = useRef<
    Record<string, { height: number; owner?: TrayMeasurementOwner }>
  >({});

  const handleContentHeightResolved = useCallback(
    (
      resolvedHeight: number,
      _measuredHeight: number,
      trayId?: string,
      mode: TrayPresentationMode = "sheet",
    ) => {
      if (
        !trayId ||
        mode !== "sheet" ||
        !Number.isFinite(resolvedHeight) ||
        resolvedHeight <= 0 ||
        measurementOwner?.mode === "fullScreen"
      ) {
        return;
      }

      // intrinsic sheet geometry is reusable, fullscreen measurements are viewport endpoints
      contentHeightCacheRef.current[trayId] = {
        height: resolvedHeight,
        owner: measurementOwner,
      };
    },
    [measurementOwner],
  );

  const restoreContentHeight = useCallback(
    (
      trayId: string | undefined,
      measuredContentHeight: number,
      mode: TrayPresentationMode = fullScreen ? "fullScreen" : "sheet",
      allowMeasuredFallback = true,
    ) => {
      if (!trayId) {
        return undefined;
      }

      const cachedMeasurement = contentHeightCacheRef.current[trayId];

      if (mode === "fullScreen") {
        if (measuredContentHeight > 0) {
          contentHeight.value = measuredContentHeight;
          return measuredContentHeight;
        }

        return undefined;
      }

      if (!allowMeasuredFallback) {
        // a fullscreen-origin handoff validates the sheet endpoint in sheet topology, so a clipped frame cannot pass as trusted
        contentHeight.value = 0;
        return undefined;
      }

      if (
        cachedMeasurement != null &&
        cachedMeasurement.owner?.mode !== "fullScreen"
      ) {
        contentHeight.value = cachedMeasurement.height;
        return cachedMeasurement.height;
      }

      if (allowMeasuredFallback && measuredContentHeight > 0) {
        contentHeight.value = measuredContentHeight;
        return measuredContentHeight;
      }

      return undefined;
    },
    [contentHeight, fullScreen],
  );

  const readCachedSheetContentHeight = useCallback((trayId?: string) => {
    if (!trayId) {
      return undefined;
    }

    const cachedMeasurement = contentHeightCacheRef.current[trayId];

    return cachedMeasurement?.owner?.mode === "fullScreen"
      ? undefined
      : cachedMeasurement?.height;
  }, []);

  return {
    actions: {
      handleContentHeightResolved,
      restoreContentHeight,
      readCachedSheetContentHeight,
    },
  };
};
