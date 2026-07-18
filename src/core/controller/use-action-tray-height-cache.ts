import { useCallback, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayMeasurementOwner } from "../../runtime/types";

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
    (resolvedHeight: number, _measuredHeight: number, trayId?: string) => {
      if (!trayId) {
        return;
      }

      // cache the resolved height because fullscreen may transform the raw measurement
      contentHeightCacheRef.current[trayId] = {
        height: resolvedHeight,
        owner: measurementOwner,
      };
    },
    [measurementOwner],
  );

  const restoreContentHeight = useCallback(
    (trayId: string | undefined, measuredContentHeight: number) => {
      if (!trayId) {
        return undefined;
      }

      const cachedMeasurement = contentHeightCacheRef.current[trayId];

      // fullscreen derives height from viewport constraints not prior sheet measurements
      if (!fullScreen && cachedMeasurement != null) {
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

  return {
    actions: {
      handleContentHeightResolved,
      restoreContentHeight,
    },
  };
};
