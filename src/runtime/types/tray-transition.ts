import type {
  TrayGeometryRole,
  TrayGeometrySnapshot,
  TrayTransitionGeometry,
  TrayTransitionParticipant,
} from "./tray-geometry";

// transition contracts describe navigation without presenter measurement or animation
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
  readonly trayId: string;
  readonly stepIndex: number;
  readonly stepKey: string;
  readonly pageIndex?: number;
  readonly mode: TrayPresentationMode;
  /** whether this endpoint keeps the sheet attached to the software keyboard */
  readonly keyboardAware?: boolean;
};

export type TraySharedRegionBehavior =
  | "persistent"
  | "keyedOverlap"
  | "replace"
  | "absent";

export type TraySharedRegionContract = {
  readonly region: "surface" | "header" | "body" | "footer";
  readonly behavior: TraySharedRegionBehavior;
  readonly sourceId?: string;
  readonly targetId?: string;
};

export type TrayTransitionContract = {
  readonly generation: number;
  readonly reason: TrayTransitionReason;
  readonly direction: TrayTransitionDirection;
  readonly boundary: TrayTransitionBoundary;
  readonly from: TrayPresentationEndpoint | null;
  readonly to: TrayPresentationEndpoint | null;
  readonly stepChanged: boolean;
  readonly pageChanged: boolean;
  readonly fullScreenChanged: boolean;
  readonly sharedRegions: readonly TraySharedRegionContract[];
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

export type TrayTransitionContractState = "provisional" | "sealed";

export type TrayTransitionLifecycleRecord = {
  contract: TrayTransitionContract;
  contractState: TrayTransitionContractState;
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
  // refine registration data before preparation seals the contract
  refineContract: (contract: TrayTransitionContract) => boolean;
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
  // called once a transition reaches completed, interrupted or cancelled
  subscribeSettled?: (
    listener: (generation: number, phase: TrayTransitionPhase) => void,
  ) => () => void;
};
