// inputs shared by the shell lifecycle hooks
import type { ReactNode } from "react";
import type { RefObject } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { TrayTransitionOptions } from "../../runtime/types";

export type TrayLifecycleParams = {
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
      latestResolvedContentHeightRef: RefObject<number>;
      latestMeasuredFooterHeightRef: RefObject<number>;
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
  originGeometryLeaseRef: RefObject<boolean>;
  // geometry ownership's one reset, run once a close finishes
  resetGeometry?: () => void;
  shared: {
    translateY: SharedValue<number>;
    contentHeight: SharedValue<number>;
    footerHeight: SharedValue<number>;
    active: SharedValue<boolean>;
    animationTravel: SharedValue<number>;
    closeGeneration: SharedValue<number>;
    surfaceOpacity: SharedValue<number>;
    originProgress: SharedValue<number>;
    originTargetContentHeight: SharedValue<number>;
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
