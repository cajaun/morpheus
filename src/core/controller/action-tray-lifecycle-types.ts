import type { ReactNode } from "react";
import type { MutableRefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionOptions } from "../../runtime/types";

export type ActionTrayLifecycleParams = {
  visible: boolean;
  rootTrayId?: string;
  trayId?: string;
  footer?: ReactNode;
  onCloseComplete?: () => void;
  renderState: {
    state: {
      renderedTrayId?: string;
      renderedFooter?: ReactNode;
    };
    actions: {
      showLatestSnapshot: () => void;
      clear: () => void;
    };
  };
  measurements: {
    shared: {
      resolvedContentHeight: SharedValue<number>;
      measuredFooterHeight: SharedValue<number>;
    };
    refs: {
      latestResolvedContentHeightRef: MutableRefObject<number>;
      latestMeasuredFooterHeightRef: MutableRefObject<number>;
    };
    state: {
      isReadyToOpen: boolean;
    };
    actions: {
      beginOpenMeasurement: (hasFooter: boolean) => void;
      enableLayout: () => void;
      completePendingOpen: () => void;
      prepareForClose: () => void;
      reset: () => void;
    };
  };
  shared: {
    translateY: SharedValue<number>;
    contentHeight: SharedValue<number>;
    footerHeight: SharedValue<number>;
    active: SharedValue<boolean>;
    animationTravel: SharedValue<number>;
    closeGeneration: SharedValue<number>;
    surfaceOpacity: SharedValue<number>;
    originProgress: SharedValue<number>;
  };
  resolveClosedTranslateY: (
    nextFooterHeight?: number,
    nextContentHeight?: number,
  ) => number;
  transition?: TrayTransitionOptions;
  onTransitionPrepared?: (details?: Record<string, unknown>) => void;
  onTransitionCommitted?: (details?: Record<string, unknown>) => void;
  onTransitionStarted?: (details?: Record<string, unknown>) => void;
  onTransitionCompleted?: (details?: Record<string, unknown>) => void;
};
