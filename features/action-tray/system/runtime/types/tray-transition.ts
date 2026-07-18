import type {
  TrayGeometryRole,
  TrayGeometrySnapshot,
  TrayTransitionGeometry,
  TrayTransitionParticipant,
} from "./tray-geometry";

// Transition contracts describe navigation knowledge without depending on
// presenter, measurement, or animation implementations.
export type TrayPresentationMode = "sheet" | "fullScreen";

export type TrayTransitionReason =
  | "open"
  | "openNested"
  | "dismiss"
  | "closeNested"
  | "returnToShell"
  | "nextStep"
  | "previousStep"
  | "pageChange";

export type TrayTransitionDirection = "forward" | "backward" | "none";

export type TrayTransitionBoundary =
  | "opening"
  | "closing"
  | "sheetToSheet"
  | "sheetToFullScreen"
  | "fullScreenToSheet"
  | "fullScreenToFullScreen";

export type TrayPresentationEndpoint = {
  trayId: string;
  stepIndex: number;
  stepKey: string;
  pageIndex?: number;
  mode: TrayPresentationMode;
};

export type TraySharedRegionBehavior =
  | "persistent"
  | "keyedOverlap"
  | "replace"
  | "absent";

export type TraySharedRegionContract = {
  region: "surface" | "header" | "body" | "footer";
  behavior: TraySharedRegionBehavior;
  sourceId?: string;
  targetId?: string;
};

export type TrayTransitionContract = {
  generation: number;
  reason: TrayTransitionReason;
  direction: TrayTransitionDirection;
  boundary: TrayTransitionBoundary;
  from: TrayPresentationEndpoint | null;
  to: TrayPresentationEndpoint | null;
  stepChanged: boolean;
  pageChanged: boolean;
  fullScreenChanged: boolean;
  sharedRegions: readonly TraySharedRegionContract[];
};

export type TrayTransitionPhase =
  | "requested"
  | "prepared"
  | "committed"
  | "layoutStarted"
  | "completed"
  | "interrupted"
  | "cancelled";

export type TrayTransitionLifecycleEvent = {
  phase: TrayTransitionPhase;
  at: number;
  details?: Record<string, unknown>;
};

export type TrayTransitionLifecycleRecord = {
  contract: TrayTransitionContract;
  phase: TrayTransitionPhase;
  events: readonly TrayTransitionLifecycleEvent[];
  geometry: TrayTransitionGeometry;
  participants: readonly TrayTransitionParticipant[];
  participantEvents: readonly TrayTransitionParticipantEvent[];
};

export type TrayTransitionParticipantEvent = {
  participantId: string;
  role: "incoming" | "outgoing";
  phase: "mounted" | "animationStarted" | "animationCompleted";
  at: number;
};

export type TrayTransitionLifecycle = {
  begin: (contract: TrayTransitionContract, at?: number) => void;
  mark: (
    generation: number,
    phase: Exclude<TrayTransitionPhase, "requested">,
    details?: Record<string, unknown>,
    at?: number,
  ) => boolean;
  captureGeometry: (
    generation: number,
    role: TrayGeometryRole,
    snapshot: TrayGeometrySnapshot,
  ) => boolean;
  registerParticipants: (
    generation: number,
    participants: readonly TrayTransitionParticipant[],
  ) => boolean;
  markParticipant: (
    generation: number,
    event: Omit<TrayTransitionParticipantEvent, "at">,
    at?: number,
  ) => boolean;
  get: (generation: number) => TrayTransitionLifecycleRecord | null;
  getActive: () => TrayTransitionLifecycleRecord | null;
  getHistory: () => readonly TrayTransitionLifecycleRecord[];
};
