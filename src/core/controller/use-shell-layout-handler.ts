import { useCallback } from "react";
import type { LayoutChangeEvent } from "react-native";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { markTrayStepShellLayout } from "../../telemetry/tray-step-timing";
import { markTrayBoundaryShellLayout } from "../../telemetry/tray-boundary-timing";
import type { TrayTransitionContract } from "../../runtime/types";
import type { useTrayGeometryOwnership } from "./use-tray-geometry-ownership";

// the shell frame feeds geometry ownership and the timing traces
export const useShellLayoutHandler = ({
  rootTrayId,
  renderedTrayIdRef,
  renderedTransitionContract,
  handleGeometryMeasured,
}: {
  rootTrayId: string | undefined;
  renderedTrayIdRef: { current: string | undefined };
  renderedTransitionContract: TrayTransitionContract | null | undefined;
  handleGeometryMeasured: ReturnType<
    typeof useTrayGeometryOwnership
  >["handlers"]["handleGeometryMeasured"];
}) =>
  useCallback(
    (event: LayoutChangeEvent) => {
      handleGeometryMeasured({ shellFrame: event.nativeEvent.layout });

      if (isTrayInstrumentationEnabled()) {
        markTrayStepShellLayout(
          rootTrayId,
          renderedTrayIdRef.current,
          renderedTransitionContract?.generation,
        );
        markTrayBoundaryShellLayout(
          rootTrayId,
          renderedTransitionContract,
          renderedTrayIdRef.current,
        );
      }
    },
    [
      handleGeometryMeasured,
      renderedTrayIdRef,
      renderedTransitionContract,
      rootTrayId,
    ],
  );
