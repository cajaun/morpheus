import { RefObject, useRef, type ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { markTrayStepSnapshotPublished } from "../../telemetry/tray-step-timing";
import { useProfiledTrayEffect, useProfiledTrayLayoutEffect } from "../../telemetry/tray-layout-effect-profiler";
import type { TrayTransitionContract } from "../../runtime/types";
import { useContentSyncDebugLog } from "./use-content-sync-debug-log";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import { isKeyboardAwareSheetStepTransition } from "../input/keyboard-transition";

type Params = {
  visible: boolean;
  interactive: boolean;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
  keyboardAware?: boolean;
  transitionContract?: TrayTransitionContract | null;
  fullScreenBackgroundScale?: number;
  content?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  justOpenedRef: RefObject<boolean>;
  measurements: {
    state: {
      layoutEnabled: boolean;
    };
    refs?: {
      latestMeasuredContentHeightRef?: { current: number };
      latestMeasuredFooterHeightRef?: { current: number };
    };
    actions: {
      setLayoutAnimationEnabled: (enabled: boolean) => void;
    };
    shared: {
      measuredContentHeight: SharedValue<number>;
      measuredFooterHeight: SharedValue<number>;
    };
  };
  renderState: {
    state: {
      renderedTrayId?: string;
      renderedContent: ReactNode;
      renderedHeader: ReactNode;
      renderedFooter: ReactNode;
      renderedFullScreen: boolean;
      renderedTransitionContract: TrayTransitionContract | null;
    };
    actions: {
      showLatestSnapshot: () => void;
      syncRenderedNodes: (activeTrayId?: string) => void;
    };
  };
  contentHeight: SharedValue<number>;
  footerHeight: SharedValue<number>;
  morphProgress: SharedValue<number>;
  resolveIncomingContentHeight: (measuredContentHeight: number) => number;
  restoreContentHeight: (
    trayId: string | undefined,
    measuredContentHeight: number,
    mode?: "sheet" | "fullScreen",
    allowMeasuredFallback?: boolean,
  ) => number | undefined;
  readCachedSheetContentHeight?: (trayId?: string) => number | undefined;
  onSheetFramePrepared?: (
    height: number,
    role: "source" | "target",
    contentHeight: number,
    trayId?: string,
  ) => void;
  onPrepared?: (details: Record<string, unknown>) => void;
};

// decide when incoming props replace the committed shell snapshot
export const useTrayContentSync = ({
  visible,
  interactive,
  rootTrayId,
  trayId,
  fullScreen,
  keyboardAware,
  transitionContract,
  fullScreenBackgroundScale,
  content,
  header,
  footer,
  containerStyle,
  className,
  footerStyle,
  justOpenedRef,
  measurements,
  renderState,
  contentHeight,
  footerHeight,
  morphProgress,
  resolveIncomingContentHeight,
  restoreContentHeight,
  readCachedSheetContentHeight,
  onSheetFramePrepared,
  onPrepared,
}: Params) => {
  const { layoutEnabled } = measurements.state;
  const { setLayoutAnimationEnabled } = measurements.actions;
  const { measuredContentHeight, measuredFooterHeight } = measurements.shared;
  const {
    renderedTrayId,
    renderedContent,
    renderedHeader,
    renderedFooter,
    renderedFullScreen,
    renderedTransitionContract,
  } =
    renderState.state;
  const { showLatestSnapshot, syncRenderedNodes } = renderState.actions;
  const {
    latestMeasuredContentHeightRef,
    latestMeasuredFooterHeightRef,
  } = measurements.refs ?? {};
  const resolveIncomingContentHeightRef = useRef(resolveIncomingContentHeight);
  resolveIncomingContentHeightRef.current = resolveIncomingContentHeight;

  const restoreContentHeightRef = useRef(restoreContentHeight);
  restoreContentHeightRef.current = restoreContentHeight;

  const readCachedSheetContentHeightRef = useRef(
    readCachedSheetContentHeight,
  );
  readCachedSheetContentHeightRef.current = readCachedSheetContentHeight;

  const onSheetFramePreparedRef = useRef(onSheetFramePrepared);
  onSheetFramePreparedRef.current = onSheetFramePrepared;

  // sheet keyboard handoffs publish the incoming snapshot before paint, the passive effect then clears this latch
  const keyboardSnapshotPublishedRef = useRef<string | undefined>(undefined);

  // prepare geometry before paint without publishing incoming React nodes
  useProfiledTrayLayoutEffect("useTrayContentSync.prepareVisibleContent", () => {
    if (!visible) {
      return;
    }

    if (justOpenedRef.current) {
      // first open prepared geometry through measurement callbacks
      justOpenedRef.current = false;
      return;
    }

    // JS refs mirror the shared values so preparation never reads from the UI runtime, the shared values serve callers with the minimal shape
    const measuredContentHeightValue =
      latestMeasuredContentHeightRef?.current ?? measuredContentHeight.value;
    const measuredFooterHeightValue =
      latestMeasuredFooterHeightRef?.current ?? measuredFooterHeight.value;

    if (renderedTrayId !== trayId || renderedFullScreen !== !!fullScreen) {
      // source visuals hold until native geometry starts, then the layout worklet advances this value to one
      morphProgress.value = 0;
    }

    if (isTrayDebugLoggingEnabled()) {
      log("TRAY CHANGE", {
        trayId,
        renderedTrayId,
        incomingFullScreen: !!fullScreen,
        renderedFullScreen,
        measuredContentHeight: measuredContentHeightValue,
        measuredFooterHeight: measuredFooterHeightValue,
        contentHeight: contentHeight.value,
        footerHeight: footerHeight.value,
        layoutEnabled,
        preparesFullScreen: !!fullScreen,
        morphProgress: morphProgress.value,
        renderedTransition: describeTrayTransition(renderedTransitionContract),
      });
    }

    // keep the last footer height when the detached layout reports zero during a boundary
    const nextFooterHeight =
      measuredFooterHeightValue > 0
        ? measuredFooterHeightValue
        : footerHeight.value;
    footerHeight.value = nextFooterHeight;

    if (fullScreen) {
      const currentContentHeight = contentHeight.value;

      if (!renderedFullScreen && currentContentHeight > 0) {
        // lease the sheet frame while children hand off so transient measurements cannot shrink the shell
        onSheetFramePreparedRef.current?.(
          currentContentHeight + nextFooterHeight,
          "source",
          currentContentHeight,
          renderedTrayId,
        );
      }

      // fullscreen measurement waits for its snapshot commit and the boundary clock
      const incomingHeight = resolveIncomingContentHeightRef.current(
        measuredContentHeightValue,
      );

      if (isTrayDebugLoggingEnabled()) {
        log("PREPARE INCOMING FULLSCREEN HEIGHT", {
          trayId,
          renderedTrayId,
          measuredContentHeight: measuredContentHeightValue,
          incomingHeight,
          applied: renderedFullScreen,
          previousContentHeight: currentContentHeight,
          morphProgress: morphProgress.value,
          renderedTransition: describeTrayTransition(renderedTransitionContract),
        });
      }

      if (renderedFullScreen) {
        contentHeight.value = incomingHeight;
      }
    } else {
      const targetStepChanged = renderedTrayId !== trayId;
      const returningFromFullScreen =
        transitionContract?.fullScreenChanged === true &&
        transitionContract.to?.mode === "sheet";
      const cachedBoundaryReturnHeight = returningFromFullScreen
        ? readCachedSheetContentHeightRef.current?.(trayId)
        : undefined;
      const restoredContentHeight = restoreContentHeightRef.current(
        trayId,
        measuredContentHeightValue,
        "sheet",
        // a fullscreen source or an earlier step's height is no fallback for a new sheet endpoint, boundary returns use the target's last validated frame and sheet changes a trusted cache
        !returningFromFullScreen && !renderedFullScreen && !targetStepChanged,
      );

      if (
        renderedFullScreen &&
        cachedBoundaryReturnHeight !== undefined
      ) {
        // a fullscreen return starts from the endpoint's validated sheet frame, a newer intrinsic layout can replace it after the snapshot mounts
        contentHeight.value = cachedBoundaryReturnHeight;
      }

      if (
        renderedFullScreen &&
        (cachedBoundaryReturnHeight !== undefined ||
          restoredContentHeight !== undefined)
      ) {
        const targetContentHeight =
          cachedBoundaryReturnHeight ?? restoredContentHeight!;
        // a sheet return leases the measured frame until the layout transition finishes
        onSheetFramePreparedRef.current?.(
          targetContentHeight + nextFooterHeight,
          "target",
          targetContentHeight,
          trayId,
        );
      } else if (
        !returningFromFullScreen &&
        !renderedFullScreen &&
        renderedTrayId !== trayId
      ) {
        // sheet-to-sheet changes promote the cached target height, fullscreen returns use the provisional path above
        const cachedContentHeight =
          readCachedSheetContentHeightRef.current?.(trayId);

        if (cachedContentHeight !== undefined) {
          contentHeight.value = cachedContentHeight;
          onSheetFramePreparedRef.current?.(
            cachedContentHeight + nextFooterHeight,
            "target",
            cachedContentHeight,
            trayId,
          );
        }
      }
    }
    setLayoutAnimationEnabled(true);
    onPrepared?.({
      trayId,
      fullScreen: !!fullScreen,
      measuredContentHeight: measuredContentHeightValue,
      measuredFooterHeight: measuredFooterHeightValue,
      resolvedContentHeight: contentHeight.value,
      morphProgress: morphProgress.value,
      renderedTransition: describeTrayTransition(renderedTransitionContract),
    });
    // shell swaps key off tray identity, not every prop change
  }, [trayId, visible, fullScreen, morphProgress, onPrepared]);

  useProfiledTrayLayoutEffect("useTrayContentSync.publishKeyboardSnapshot", () => {
    if (
      !visible ||
      renderedTrayId === trayId ||
      !isKeyboardAwareSheetStepTransition(transitionContract)
    ) {
      return;
    }

    keyboardSnapshotPublishedRef.current = trayId;
    markTrayStepSnapshotPublished(
      rootTrayId,
      trayId,
      transitionContract?.generation,
    );
    showLatestSnapshot();
  }, [
    renderedTrayId,
    rootTrayId,
    showLatestSnapshot,
    trayId,
    transitionContract,
    visible,
  ]);

  // publish visual content once native layout can derive the sheet frame
  useProfiledTrayEffect("core/controller/use-tray-content-sync#1", () => {
    if (!visible) {
      return;
    }

    if (renderedTrayId === trayId) {
      // same-key updates sync nodes without replaying snapshot publication
      syncRenderedNodes(trayId);
      return;
    }

    if (keyboardSnapshotPublishedRef.current === trayId) {
      keyboardSnapshotPublishedRef.current = undefined;
      return;
    }

    // key changes publish a new snapshot after pre-paint geometry preparation
    markTrayStepSnapshotPublished(
      rootTrayId,
      trayId,
      transitionContract?.generation,
    );
    showLatestSnapshot();
  }, [
    className,
    containerStyle,
    content,
    header,
    footer,
    footerStyle,
    fullScreen,
    fullScreenBackgroundScale,
    keyboardAware,
    rootTrayId,
    renderedTrayId,
    showLatestSnapshot,
    syncRenderedNodes,
    trayId,
    transitionContract,
    visible,
  ]);

  useContentSyncDebugLog({
    visible,
    trayId,
    content,
    footer,
    header,
    fullScreen,
    fullScreenBackgroundScale,
    renderedFullScreen,
    containerStyle,
    footerStyle,
    className,
    interactive,
    renderedTrayId,
    renderedContent,
    renderedFooter,
    renderedHeader,
  });
};
