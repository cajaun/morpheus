import type {
  TrayPresentationEndpoint,
  TrayPresentationMode,
} from "./tray-transition";

export type TrayCoordinateSpace =
  | "screen"
  | "traySurface"
  | "header"
  | "body"
  | "footer";

export type TrayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TrayInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type TrayMeasurementOwner = {
  rootTrayId: string;
  trayId: string;
  stepKey: string;
  stepIndex: number;
  pageIndex?: number;
  mode: TrayPresentationMode;
  generation: number;
  presentationKey: string;
};

export type TrayGeometrySnapshot = {
  owner: TrayMeasurementOwner;
  capturedAt: number;
  shellFrame?: TrayRect;
  headerFrame?: TrayRect;
  bodyFrame?: TrayRect;
  footerFrame?: TrayRect;
  safeAreaInsets?: TrayInsets;
  measuredContentHeight?: number;
  resolvedContentHeight?: number;
  measuredFooterHeight?: number;
};

export type TrayGeometryRole = "source" | "target";

export type TrayTransitionGeometry = {
  source?: TrayGeometrySnapshot;
  target?: TrayGeometrySnapshot;
};

export type TrayTransitionParticipantRole =
  | "outgoing"
  | "incoming"
  | "shared";

export type TrayTransitionRegion = "surface" | "header" | "body" | "footer";

export type TrayTransitionParticipant = {
  id: string;
  role: TrayTransitionParticipantRole;
  region: TrayTransitionRegion;
  coordinateSpace: TrayCoordinateSpace;
  endpoint: TrayPresentationEndpoint;
};

export const createTrayMeasurementOwner = ({
  rootTrayId,
  endpoint,
  generation,
}: {
  rootTrayId: string;
  endpoint: TrayPresentationEndpoint;
  generation: number;
}): TrayMeasurementOwner => ({
  rootTrayId,
  trayId: endpoint.trayId,
  stepKey: endpoint.stepKey,
  stepIndex: endpoint.stepIndex,
  pageIndex: endpoint.pageIndex,
  mode: endpoint.mode,
  generation,
  presentationKey: [
    rootTrayId,
    endpoint.trayId,
    endpoint.stepKey,
    endpoint.pageIndex ?? "step",
    endpoint.mode,
    generation,
  ].join("::"),
});
