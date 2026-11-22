import React, { useCallback, useContext, useSyncExternalStore } from "react";
import { type StyleProp, type ViewStyle } from "react-native";

export type TrayStepFooterPlacement = "pinned" | "content";

export type TrayStepFooterState = {
  key: string | null;
  node: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  placement: TrayStepFooterPlacement;
  // the step whose content layer draws an entering footer
  hostTrayId: string | null;
  // the transition an entering footer comes in with, it pins once that completes
  generation: number;
  // pinned after entering in the content, shown at once without motion
  settled: boolean;
};

export const EMPTY_STEP_FOOTER_STATE: TrayStepFooterState = {
  key: null,
  node: null,
  placement: "pinned",
  hostTrayId: null,
  generation: 0,
  settled: false,
};

export type TrayStepFooterPayload = {
  trayId: string;
  stepFooter?: React.ReactNode;
  stepFooterKey?: string | null;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
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
    className: payload.footerClassName,
    hostTrayId: payload.trayId,
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
  };
};

export const areStepFooterStatesEqual = (
  left: TrayStepFooterState,
  right: TrayStepFooterState,
) =>
  left.key === right.key &&
  left.node === right.node &&
  left.style === right.style &&
  left.className === right.className &&
  left.placement === right.placement &&
  left.hostTrayId === right.hostTrayId &&
  left.generation === right.generation &&
  left.settled === right.settled;

export type TrayStepFooterStore = {
  getSnapshot: () => TrayStepFooterState;
  subscribe: (listener: () => void) => () => void;
  // place the footer of a committed step
  commit: (payload: TrayStepFooterPayload) => void;
  // pin an entering footer once its transition completes
  settle: (generation: number) => void;
};

export const createStepFooterStore = (): TrayStepFooterStore => {
  let state = EMPTY_STEP_FOOTER_STATE;
  const listeners = new Set<() => void>();
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
    commit: (payload) => set(resolveStepFooterState(state, payload)),
    settle: (generation) => {
      if (state.placement === "content" && state.generation === generation) {
        set({ ...state, placement: "pinned", settled: true });
      }
    },
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
