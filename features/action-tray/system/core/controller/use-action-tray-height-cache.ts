import { useCallback, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";

type Params = {
  fullScreen?: boolean;
  contentHeight: SharedValue<number>;
};

// cache heights so tray swaps preserve geometry between related presentations
export const useActionTrayHeightCache = ({
  fullScreen,
  contentHeight,
}: Params) => {
  const contentHeightCacheRef = useRef<Record<string, number>>({});

  const handleContentHeightResolved = useCallback(
    (resolvedHeight: number, _measuredHeight: number, trayId?: string) => {
      if (!trayId) {
        return;
      }

      // cache the resolved height because fullscreen may transform the raw measurement
      contentHeightCacheRef.current[trayId] = resolvedHeight;
    },
    [],
  );

  const restoreContentHeight = useCallback(
    (trayId: string | undefined, measuredContentHeight: number) => {
      if (!trayId) {
        return;
      }

      const cachedHeight = contentHeightCacheRef.current[trayId];

      // fullscreen derives height from viewport constraints not prior sheet measurements
      if (!fullScreen && cachedHeight != null) {
        contentHeight.value = cachedHeight;
        return;
      }

      if (measuredContentHeight > 0) {
        contentHeight.value = measuredContentHeight;
      }
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
