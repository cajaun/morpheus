
import type { SharedValue } from "react-native-reanimated";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

// re-resolve the shared content height when presentation policy changes for the measured step
export const useContentHeightRefresh = ({
  visible,
  trayId,
  renderedTrayId,
  latestMeasuredTrayIdRef,
  measuredContentHeight,
  contentHeight,
  resolveMeasuredContentHeight,
}: {
  visible: boolean | undefined;
  trayId: string | undefined;
  renderedTrayId: string | undefined;
  latestMeasuredTrayIdRef: { current: string | undefined };
  measuredContentHeight: SharedValue<number>;
  contentHeight: SharedValue<number>;
  resolveMeasuredContentHeight: (measuredHeight: number) => number;
}) => {
  useProfiledTrayEffect("core/controller/use-content-height-refresh#1", () => {
    if (!visible) {
      return;
    }

    // skip until the rendered snapshot and the last measurement belong to this step
    if (
      renderedTrayId !== trayId ||
      latestMeasuredTrayIdRef.current !== renderedTrayId
    ) {
      return;
    }

    if (measuredContentHeight.value <= 0) {
      return;
    }

    contentHeight.value = resolveMeasuredContentHeight(
      measuredContentHeight.value,
    );
  }, [
    measuredContentHeight,
    latestMeasuredTrayIdRef,
    resolveMeasuredContentHeight,
    contentHeight,
    renderedTrayId,
    trayId,
    visible,
  ]);
};
