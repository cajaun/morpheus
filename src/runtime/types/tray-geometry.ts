// immutable measurement ownership for tray geometry
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
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type TrayInsets = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export type TrayMeasurementOwner = {
  readonly rootTrayId: string;
  readonly trayId: string;
  readonly stepKey: string;
  readonly stepIndex: number;
  readonly pageIndex?: number;
  readonly mode: TrayPresentationMode;
  readonly generation: number;
  readonly presentationKey: string;
};

export type TrayGeometrySnapshot = {
  readonly owner: TrayMeasurementOwner;
  readonly capturedAt: number;
  readonly shellFrame?: TrayRect;
  readonly headerFrame?: TrayRect;
  readonly bodyFrame?: TrayRect;
  readonly footerFrame?: TrayRect;
  readonly safeAreaInsets?: TrayInsets;
  readonly measuredContentHeight?: number;
  readonly resolvedContentHeight?: number;
  readonly measuredFooterHeight?: number;
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

// an immutable owner key for one measured presentation endpoint
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
