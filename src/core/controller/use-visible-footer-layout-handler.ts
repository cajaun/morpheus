import type React from "react";
import { useCallback } from "react";
import type { LayoutChangeEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { log } from "../logger";
import {
  areLayoutSignaturesEqual,
  type LayoutSignature,
  type TrayMeasurementParams,
} from "./measurement-types";

// the visible fixed footer reports the footer height and the first-open gate
export const useVisibleFooterLayoutHandler = ({
  renderedSnapshotRef,
  renderedTrayId,
  renderedFooter,
  measurementOwnerRef,
  measurementOwner,
  renderedFullScreen,
  lastVisibleFooterLayoutRef,
  latestMeasuredFooterHeightRef,
  latestMeasuredFooterNodeRef,
  latestMeasuredFooterTrayIdRef,
  latestMeasuredFooterFullScreenRef,
  measuredFooterHeight,
  footerHeight,
  onGeometryMeasured,
  footerMeasuredRef,
  syncOpenReadiness,
}: Required<Pick<TrayMeasurementParams, "renderedFullScreen">> &
  Pick<
    TrayMeasurementParams,
    | "renderedSnapshotRef"
    | "renderedTrayId"
    | "renderedFooter"
    | "measurementOwnerRef"
    | "measurementOwner"
    | "footerHeight"
    | "onGeometryMeasured"
  > & {
    lastVisibleFooterLayoutRef: { current: LayoutSignature | null };
    latestMeasuredFooterHeightRef: { current: number };
    latestMeasuredFooterNodeRef: { current: React.ReactNode | undefined };
    latestMeasuredFooterTrayIdRef: { current: string | undefined };
    latestMeasuredFooterFullScreenRef: { current: boolean };
    measuredFooterHeight: SharedValue<number>;
    footerMeasuredRef: { current: boolean };
    syncOpenReadiness: () => void;
  }) =>
  useCallback(
    (e: LayoutChangeEvent) => {
      const committedSnapshot = renderedSnapshotRef?.current;
      const committedTrayId = committedSnapshot?.trayId ?? renderedTrayId;
      const committedFooter = committedSnapshot?.footer ?? renderedFooter;
      const committedMeasurementOwner =
        measurementOwnerRef?.current ?? measurementOwner;

      if (!committedFooter) {
        return;
      }

      // the visible footer drives the first-open gate and later height changes, an offscreen copy would mount the footer twice
      const height = e.nativeEvent.layout.height;
      const layoutSignature: LayoutSignature = {
        ownerKey: committedMeasurementOwner?.presentationKey,
        trayId: committedTrayId,
        fullScreen: renderedFullScreen,
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height,
      };

      if (
        areLayoutSignaturesEqual(
          lastVisibleFooterLayoutRef.current,
          layoutSignature,
        )
      ) {
        return;
      }

      lastVisibleFooterLayoutRef.current = layoutSignature;
      // keep the last stable footer height during transient morph-out layouts
      if (height <= 1 && latestMeasuredFooterHeightRef.current > 0) {
        return;
      }

      log("VISIBLE FOOTER onLayout", {
        height,
        measuredRef: latestMeasuredFooterHeightRef.current,
        delta: height - latestMeasuredFooterHeightRef.current,
      });

      latestMeasuredFooterHeightRef.current = height;
      latestMeasuredFooterNodeRef.current = committedFooter;
      latestMeasuredFooterTrayIdRef.current = committedTrayId;
      latestMeasuredFooterFullScreenRef.current = renderedFullScreen;
      measuredFooterHeight.value = height;
      footerHeight.value = height;
      onGeometryMeasured?.({
        footerFrame: e.nativeEvent.layout,
        measuredFooterHeight: height,
      });
      if (height > 1) {
        footerMeasuredRef.current = true;
        syncOpenReadiness();
      }
    },
    [
      footerHeight,
      measuredFooterHeight,
      measurementOwner,
      measurementOwnerRef,
      onGeometryMeasured,
      renderedFullScreen,
      renderedFooter,
      renderedSnapshotRef,
      renderedTrayId,
      syncOpenReadiness,
      footerMeasuredRef,
      lastVisibleFooterLayoutRef,
      latestMeasuredFooterFullScreenRef,
      latestMeasuredFooterHeightRef,
      latestMeasuredFooterNodeRef,
      latestMeasuredFooterTrayIdRef,
    ],
  );
