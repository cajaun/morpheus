import { useCallback } from "react";
import type { LayoutChangeEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { log } from "../logger";
import {
  areLayoutSignaturesEqual,
  resolveOwnerEndpointKey,
  type LayoutSignature,
  type TrayMeasurementParams,
} from "./measurement-types";

// accept a content layout as the sheet height after the lease, owner and endpoint checks pass
export const useContentLayoutHandler = ({
  renderedSnapshotRef,
  renderedTrayId,
  measurementOwnerRef,
  measurementOwner,
  acceptContentMeasurement,
  contentMeasurementLeaseActive,
  contentMeasurementLeaseRef,
  renderedFullScreen,
  allowIntrinsicSheetMeasurementDuringLease,
  latestMeasuredContentHeightRef,
  latestResolvedContentHeightRef,
  originGeometryLeaseRef,
  hasRenderedBody,
  contentHeight,
  resolveContentHeight,
  preparedSheetFrameRef,
  committedSheetFrameRef,
  footerHeight,
  lastContentLayoutRef,
  latestMeasuredTrayIdRef,
  measuredContentHeight,
  resolvedContentHeight,
  onContentHeightResolved,
  onGeometryMeasured,
  onSheetContentHeightMeasured,
  contentMeasuredRef,
  markContentMeasured,
}: Required<
  Pick<
    TrayMeasurementParams,
    | "renderedFullScreen"
    | "hasRenderedBody"
    | "acceptContentMeasurement"
    | "contentMeasurementLeaseActive"
    | "allowIntrinsicSheetMeasurementDuringLease"
  >
> &
  Pick<
    TrayMeasurementParams,
    | "renderedSnapshotRef"
    | "renderedTrayId"
    | "measurementOwnerRef"
    | "measurementOwner"
    | "contentMeasurementLeaseRef"
    | "originGeometryLeaseRef"
    | "contentHeight"
    | "resolveContentHeight"
    | "preparedSheetFrameRef"
    | "committedSheetFrameRef"
    | "footerHeight"
    | "onContentHeightResolved"
    | "onGeometryMeasured"
    | "onSheetContentHeightMeasured"
  > & {
    latestMeasuredContentHeightRef: { current: number };
    latestResolvedContentHeightRef: { current: number };
    latestMeasuredTrayIdRef: { current: string | undefined };
    lastContentLayoutRef: { current: LayoutSignature | null };
    contentMeasuredRef: { current: boolean };
    measuredContentHeight: SharedValue<number>;
    resolvedContentHeight: SharedValue<number>;
    markContentMeasured: () => void;
  }) =>
  useCallback(
    (e: LayoutChangeEvent) => {
      const committedSnapshot = renderedSnapshotRef?.current;
      const committedTrayId = committedSnapshot?.trayId ?? renderedTrayId;
      const committedMeasurementOwner =
        measurementOwnerRef?.current ?? measurementOwner;

      if (!acceptContentMeasurement) {
        // drop layout frames from the old snapshot after the fullscreen viewport changes
        log("CONTENT onLayout ignored during boundary handoff", {
          height: e.nativeEvent.layout.height,
          trayId: committedTrayId,
          acceptContentMeasurement,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef:
            contentMeasurementLeaseRef?.current ?? false,
          renderedFullScreen,
          measurementOwner: committedMeasurementOwner?.presentationKey,
        });
        return;
      }

      const canMeasureIntrinsicSheetDuringLease =
        allowIntrinsicSheetMeasurementDuringLease &&
        !renderedFullScreen &&
        committedMeasurementOwner?.mode === "sheet" &&
        committedMeasurementOwner.trayId === committedTrayId;

      if (
        !canMeasureIntrinsicSheetDuringLease &&
        (contentMeasurementLeaseActive ||
          contentMeasurementLeaseRef?.current === true)
      ) {
        // drop animated viewport frames so intermediate heights never become sheet heights
        log("CONTENT onLayout ignored during sheet frame lease", {
          height: e.nativeEvent.layout.height,
          trayId: committedTrayId,
          acceptContentMeasurement,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef:
            contentMeasurementLeaseRef?.current ?? false,
          renderedFullScreen,
          measurementOwner: committedMeasurementOwner?.presentationKey,
          latestMeasuredContentHeight: latestMeasuredContentHeightRef.current,
          latestResolvedContentHeight: latestResolvedContentHeightRef.current,
        });
        return;
      }

      if (originGeometryLeaseRef?.current === true) {
        // the trigger origin owns the target while transient fullscreen layouts drain
        log("CONTENT onLayout ignored during trigger origin lease", {
          height: e.nativeEvent.layout.height,
          trayId: committedTrayId,
          acceptContentMeasurement,
          originGeometryLeaseActive: originGeometryLeaseRef.current,
          renderedFullScreen,
          measurementOwner: committedMeasurementOwner?.presentationKey,
          latestMeasuredContentHeight: latestMeasuredContentHeightRef.current,
          latestResolvedContentHeight: latestResolvedContentHeightRef.current,
        });
        return;
      }

      const height = e.nativeEvent.layout.height;
      const previousMeasuredHeight = latestMeasuredContentHeightRef.current;

      const callbackOwnerKey = committedMeasurementOwner?.presentationKey;
      const currentOwnerKey = committedMeasurementOwner?.presentationKey;

      if (callbackOwnerKey !== currentOwnerKey) {
        log("CONTENT onLayout ignored — stale measurement owner", {
          height,
          trayId: committedTrayId,
          callbackOwnerKey,
          currentOwnerKey,
          renderedFullScreen,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef:
            contentMeasurementLeaseRef?.current ?? false,
        });
        return;
      }

      // zero-height body frames from outgoing native layout are no valid sheet endpoint
      if (hasRenderedBody && (!Number.isFinite(height) || height <= 1)) {
        log("CONTENT onLayout ignored — invalid body endpoint", {
          height,
          trayId: committedTrayId,
          previousMeasuredHeight,
          currentContentHeight: contentHeight.value,
          measurementOwner: currentOwnerKey,
          renderedFullScreen,
          contentMeasurementLeaseActive,
          contentMeasurementLeaseRef:
            contentMeasurementLeaseRef?.current ?? false,
        });
        return;
      }

      const resolvedHeight = resolveContentHeight
        ? resolveContentHeight(height)
        : height;
      const previousResolvedHeight = latestResolvedContentHeightRef.current;
      const preparedSheetFrame = preparedSheetFrameRef?.current;
      const preparedFrameMatchesOwner =
        preparedSheetFrame !== undefined &&
        committedMeasurementOwner !== undefined &&
        preparedSheetFrame.generation ===
          committedMeasurementOwner.generation &&
        preparedSheetFrame.endpointKey ===
          resolveOwnerEndpointKey(committedMeasurementOwner);

      if (
        canMeasureIntrinsicSheetDuringLease &&
        preparedFrameMatchesOwner &&
        preparedSheetFrame !== undefined &&
        resolvedHeight < preparedSheetFrame.contentHeight
      ) {
        // the cached intrinsic frame is the floor during the return handoff, a shorter layout while text reattaches would clip the footer
        log("CONTENT onLayout ignored — below prepared intrinsic floor", {
          height,
          resolvedHeight,
          preparedContentHeight: preparedSheetFrame.contentHeight,
          trayId: committedTrayId,
          measurementOwner: committedMeasurementOwner?.presentationKey,
        });
        return;
      }
      const layoutSignature: LayoutSignature = {
        ownerKey: currentOwnerKey,
        trayId: committedTrayId,
        fullScreen: renderedFullScreen,
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height,
        resolvedHeight,
      };

      const committedSheetFrame = committedSheetFrameRef?.current;
      const committedFrameMatchesOwner =
        committedSheetFrame !== undefined &&
        committedMeasurementOwner !== undefined &&
        committedSheetFrame.generation ===
          committedMeasurementOwner.generation &&
        committedSheetFrame.endpointKey ===
          resolveOwnerEndpointKey(committedMeasurementOwner);

      if (
        committedFrameMatchesOwner &&
        Math.abs(resolvedHeight - committedSheetFrame.contentHeight) >= 0.001 &&
        !(
          !renderedFullScreen &&
          resolvedHeight > committedSheetFrame.contentHeight
        )
      ) {
        log("CONTENT onLayout ignored — completed sheet frame owns geometry", {
          height,
          resolvedHeight,
          committedContentHeight: committedSheetFrame.contentHeight,
          committedTotalHeight: committedSheetFrame.totalHeight,
          committedGeneration: committedSheetFrame.generation,
          committedEndpointKey: committedSheetFrame.endpointKey,
          measurementOwner: committedMeasurementOwner?.presentationKey,
          renderedTrayId: committedTrayId,
          renderedFullScreen,
        });
        return;
      }

      if (
        committedFrameMatchesOwner &&
        committedSheetFrame !== undefined &&
        !renderedFullScreen &&
        resolvedHeight > committedSheetFrame.contentHeight
      ) {
        // a composite body can finish layout after the boundary commits, so a larger endpoint promotes the committed frame
        committedSheetFrameRef!.current = {
          ...committedSheetFrame,
          contentHeight: resolvedHeight,
          totalHeight: resolvedHeight + footerHeight.value,
        };
      }

      if (
        areLayoutSignaturesEqual(lastContentLayoutRef.current, layoutSignature)
      ) {
        return;
      }

      lastContentLayoutRef.current = layoutSignature;

      // measured height is the raw content size, resolved height applies tray policy
      latestMeasuredContentHeightRef.current = height;
      latestResolvedContentHeightRef.current = resolvedHeight;
      latestMeasuredTrayIdRef.current = committedTrayId;
      measuredContentHeight.value = height;
      resolvedContentHeight.value = resolvedHeight;
      contentHeight.value = resolvedHeight;
      onContentHeightResolved?.(
        resolvedHeight,
        height,
        committedTrayId,
        renderedFullScreen ? "fullScreen" : "sheet",
      );
      onGeometryMeasured?.({
        bodyFrame: e.nativeEvent.layout,
        measuredContentHeight: height,
        resolvedContentHeight: resolvedHeight,
      });
      if (!renderedFullScreen) {
        onSheetContentHeightMeasured?.(resolvedHeight, committedTrayId);
      }

      if (!contentMeasuredRef.current && committedTrayId !== undefined) {
        // content counts as measured once it belongs to a named rendered tray
        markContentMeasured();
      }

      log("CONTENT onLayout", {
        height,
        resolvedHeight,
        trayId: committedTrayId,
        previousMeasuredHeight,
        previousResolvedHeight,
        currentContentHeight: contentHeight.value,
        currentFooterHeight: footerHeight.value,
        renderedFullScreen,
        acceptContentMeasurement,
        contentMeasurementLeaseActive,
        contentMeasurementLeaseRef:
          contentMeasurementLeaseRef?.current ?? false,
        measurementOwner: currentOwnerKey,
      });
    },
    [
      contentHeight,
      markContentMeasured,
      acceptContentMeasurement,
      contentMeasurementLeaseActive,
      contentMeasurementLeaseRef,
      allowIntrinsicSheetMeasurementDuringLease,
      originGeometryLeaseRef,
      preparedSheetFrameRef,
      committedSheetFrameRef,
      footerHeight,
      hasRenderedBody,
      measuredContentHeight,
      onContentHeightResolved,
      onSheetContentHeightMeasured,
      onGeometryMeasured,
      measurementOwner,
      measurementOwnerRef,
      renderedTrayId,
      renderedFullScreen,
      renderedSnapshotRef,
      resolvedContentHeight,
      resolveContentHeight,
      contentMeasuredRef,
      lastContentLayoutRef,
      latestMeasuredContentHeightRef,
      latestMeasuredTrayIdRef,
      latestResolvedContentHeightRef,
    ],
  );
