import type { SharedValue } from "react-native-reanimated";
import type {
  TrayPresentationMode,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../../runtime/types";
import type { TraySheetFrame } from "../types/tray";

type Ref<T> = { current: T };

export type TransitionCallbackParams = {
  rootTrayId?: string;
  transitionLifecycle?: TrayTransitionLifecycle;
  activeTrayIdRef: Ref<string | undefined>;
  activeTransitionGenerationRef: Ref<number | undefined>;
  activeTransitionRef: Ref<TrayTransitionContract | null | undefined>;
  renderedTransitionGenerationRef: Ref<number | undefined>;
  renderedTransitionRef: Ref<TrayTransitionContract | null | undefined>;
  renderedFullScreenRef: Ref<boolean>;
  lastHandledLayoutCompletionGenerationRef: Ref<number>;
  returningToSheetRef: Ref<boolean>;
  latestLayoutFrameRef: Ref<{
    contentHeight: number;
    footerHeight: number;
  }>;
  preparedSheetFrameRef: Ref<TraySheetFrame | undefined>;
  committedSheetFrameRef: Ref<TraySheetFrame | undefined>;
  contentMeasurementLeaseRef: Ref<boolean>;
  measuredFooterHeightRef: Ref<number>;
  footerHeight: SharedValue<number>;
  commitStableContentHeight: (
    height: number,
    trayId?: string,
    mode?: TrayPresentationMode,
  ) => boolean;
  clearPreparedSheetFrame: () => void;
};
