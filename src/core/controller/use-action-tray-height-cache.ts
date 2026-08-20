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

// cache heights so tray swaps preserve geometry between related presentations
export const useActionTrayHeightCache = ({
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

      // only intrinsic sheet geometry is reusable fullscreen measurements are viewport endpoints not body endpoints for a later sheet
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

      if (
        cachedMeasurement != null &&
        cachedMeasurement.owner?.mode !== "fullScreen"
      ) {
        contentHeight.value = cachedMeasurement.height;
        return cachedMeasurement.height;
      }

      if (measuredContentHeight > 0) {
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
