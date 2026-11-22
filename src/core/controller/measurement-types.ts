import type React from "react";
import type { SharedValue } from "react-native-reanimated";
import type {
  TrayGeometrySnapshot,
  TrayMeasurementOwner,
  TrayPresentationMode,
} from "../../runtime/types";
import type { TraySheetFrame } from "../types/tray";
import type { RenderedTrayState } from "../types";

// measurement owns the geometry contract the open animation depends on
export type TrayMeasurementParams = {
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;

  renderedTrayId?: string;
  renderedFullScreen?: boolean;
  renderedFooter?: React.ReactNode;
  renderedSnapshotRef?: { current: RenderedTrayState };
  hasRenderedBody?: boolean;
  acceptContentMeasurement?: boolean;
  contentMeasurementLeaseActive?: boolean;
  contentMeasurementLeaseRef?: { current: boolean };
  allowIntrinsicSheetMeasurementDuringLease?: boolean;
  originGeometryLeaseRef?: { current: boolean };
  preparedSheetFrameRef?: { current: TraySheetFrame | undefined };
  committedSheetFrameRef?: { current: TraySheetFrame | undefined };
  measurementOwnerRef?: { current: TrayMeasurementOwner | undefined };
  resolveContentHeight?: (measuredHeight: number) => number;
  onContentHeightResolved?: (
    resolvedHeight: number,
    measuredHeight: number,
    trayId?: string,
    mode?: TrayPresentationMode,
  ) => void;
  onSheetContentHeightMeasured?: (
    resolvedHeight: number,
    trayId?: string,
  ) => void;
  measurementOwner?: TrayMeasurementOwner;
  onGeometryMeasured?: (
    geometry: Partial<Omit<TrayGeometrySnapshot, "owner" | "capturedAt">>,
  ) => void;
};

export type LayoutSignature = {
  ownerKey?: string;
  trayId?: string;
  fullScreen: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  resolvedHeight?: number;
};

export const areLayoutSignaturesEqual = (
  previous: LayoutSignature | null,
  next: LayoutSignature,
) =>
  previous !== null &&
  previous.ownerKey === next.ownerKey &&
  previous.trayId === next.trayId &&
  previous.fullScreen === next.fullScreen &&
  previous.x === next.x &&
  previous.y === next.y &&
  previous.width === next.width &&
  previous.height === next.height &&
  previous.resolvedHeight === next.resolvedHeight;

// the sheet frame endpoint key of a measurement owner
export const resolveOwnerEndpointKey = (owner: TrayMeasurementOwner) =>
  [owner.trayId, owner.stepKey, owner.pageIndex ?? "step", owner.mode].join(
    "::",
  );
