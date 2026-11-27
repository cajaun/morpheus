import React, {
  isValidElement,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { type StyleProp, type ViewStyle } from "react-native";

export type TrayStepFooterPlacement = "pinned" | "content";

export type TrayStepFooterExitMode = "inPlace" | "withContent";

// a pinned footer handed to the content it leaves with, drawn below that content until the transition completes
export type TrayStepFooterExiting = {
  key: string;
  node: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hostTrayId: string;
  generation: number;
};

export type TrayStepFooterState = {
  key: string | null;
  node: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  placement: TrayStepFooterPlacement;
  // the step whose content layer draws an entering footer
  hostTrayId: string | null;
  // the transition an entering footer comes in with, it pins once that completes
  generation: number;
  // pinned after entering in the content, shown at once without motion
  settled: boolean;
  // how this footer leaves, read from its Tray.Footer exit prop
  exit: TrayStepFooterExitMode;
  exiting: TrayStepFooterExiting | null;
};

export const EMPTY_STEP_FOOTER_STATE: TrayStepFooterState = {
  key: null,
  node: null,
  placement: "pinned",
  hostTrayId: null,
  generation: 0,
  settled: false,
  exit: "inPlace",
  exiting: null,
};

// the exit prop of the Tray.Footer element a step declares
export const resolveStepFooterExit = (
  node: React.ReactNode,
): TrayStepFooterExitMode =>
  isValidElement<{ exit?: unknown }>(node) && node.props.exit === "withContent"
    ? "withContent"
    : "inPlace";

export type TrayStepFooterPayload = {
  trayId: string;
  stepFooter?: React.ReactNode;
  stepFooterKey?: string | null;
  footerStyle?: StyleProp<ViewStyle>;
  isFirstRender: boolean;
  fullScreen: boolean;
  transitionContract: {
    generation: number;
    fullScreenChanged?: boolean;
  } | null;
};

// where a newly committed step draws its footer
export const resolveStepFooterState = (
  previous: TrayStepFooterState,
  payload: TrayStepFooterPayload,
): TrayStepFooterState => {
  const key = payload.stepFooterKey ?? null;
  const generation = payload.transitionContract?.generation ?? 0;
  const content = {
    key,
    node: key != null ? (payload.stepFooter ?? null) : null,
    style: payload.footerStyle,
    hostTrayId: payload.trayId,
    exit: resolveStepFooterExit(payload.stepFooter),
  };

  if (key === previous.key) {
    // the same footer keeps its place, an entering footer keeps entering with this step and settles with this transition
    return {
      ...previous,
      ...content,
      generation:
        previous.placement === "content" ? generation : previous.generation,
    };
  }

  // a pinned footer that leaves with its content hands its last frame to the outgoing step, an unsettled one already lives there
  const exiting: TrayStepFooterExiting | null =
    previous.key != null &&
    previous.exit === "withContent" &&
    previous.placement === "pinned" &&
    previous.hostTrayId != null &&
    previous.hostTrayId !== payload.trayId &&
    generation > 0 &&
    !payload.isFirstRender
      ? {
          key: previous.key,
          node: previous.node,
          style: previous.style,
          hostTrayId: previous.hostTrayId,
          generation,
        }
      : null;

  const entersWithContent =
    key != null &&
    generation > 0 &&
    !payload.isFirstRender &&
    // fullscreen content is not laid out in a resizing sheet, so fade in place
    !payload.fullScreen &&
    payload.transitionContract?.fullScreenChanged !== true;

  return {
    ...content,
    placement: entersWithContent ? "content" : "pinned",
    generation,
    settled: false,
    exiting,
  };
};

export const areStepFooterStatesEqual = (
  left: TrayStepFooterState,
  right: TrayStepFooterState,
) =>
  left.key === right.key &&
  left.node === right.node &&
  left.style === right.style &&
  left.placement === right.placement &&
  left.hostTrayId === right.hostTrayId &&
  left.generation === right.generation &&
  left.settled === right.settled &&
  left.exit === right.exit &&
  left.exiting === right.exiting;

export type TrayStepFooterStore = {
  getSnapshot: () => TrayStepFooterState;
  subscribe: (listener: () => void) => () => void;
  // place the footer of a committed step
  commit: (payload: TrayStepFooterPayload) => void;
  // pin an entering footer and drop an exiting one once their transition completes
  settle: (generation: number) => void;
  // a finger on the entering footer defers its pin, moving it remounts the button and drops the tap, the returned release pins it if its transition already completed, a step change drops every hold
  holdPin: () => () => void;
  // each step layer's bottom edge in the content region, where an exiting footer sits
  recordContentHeight: (trayId: string, height: number) => void;
  getContentHeight: (trayId: string) => number | undefined;
};

export const createStepFooterStore = (): TrayStepFooterStore => {
  let state = EMPTY_STEP_FOOTER_STATE;
  const contentHeights = new Map<string, number>();
  const listeners = new Set<() => void>();
  let holds = 0;
  let pendingPin: number | null = null;
  // holds belong to one step change, a release from an earlier one does nothing
  let holdEpoch = 0;
  const set = (next: TrayStepFooterState) => {
    if (areStepFooterStatesEqual(state, next)) {
      return;
    }

    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    commit: (payload) => {
      const next = resolveStepFooterState(state, payload);

      if (next.generation !== state.generation) {
        // a held footer whose step changed never pins from that touch, the new transition settles on its own
        holds = 0;
        pendingPin = null;
        holdEpoch += 1;
      }

      set(next);
    },
    settle: (generation) => {
      let next = state;

      if (next.placement === "content" && next.generation === generation) {
        if (holds > 0) {
          pendingPin = generation;
        } else {
          next = { ...next, placement: "pinned", settled: true };
        }
      }

      if (next.exiting !== null && next.exiting.generation <= generation) {
        next = { ...next, exiting: null };
      }

      set(next);
    },
    holdPin: () => {
      const epoch = holdEpoch;
      let released = false;
      holds += 1;

      return () => {
        if (released || epoch !== holdEpoch) {
          return;
        }

        released = true;
        holds -= 1;

        if (holds > 0 || pendingPin === null) {
          return;
        }

        const generation = pendingPin;
        pendingPin = null;

        if (state.placement === "content" && state.generation === generation) {
          set({ ...state, placement: "pinned", settled: true });
        }
      };
    },
    recordContentHeight: (trayId, height) => {
      contentHeights.set(trayId, height);
    },
    getContentHeight: (trayId) => contentHeights.get(trayId),
  };
};

export const TrayStepFooterStoreContext =
  React.createContext<TrayStepFooterStore | null>(null);

export const useStepFooterState = () => {
  const store = useContext(TrayStepFooterStoreContext);
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(listener) ?? (() => {}),
    [store],
  );
  const getSnapshot = useCallback(
    () => store?.getSnapshot() ?? EMPTY_STEP_FOOTER_STATE,
    [store],
  );

  return {
    store,
    state: useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
  };
};
