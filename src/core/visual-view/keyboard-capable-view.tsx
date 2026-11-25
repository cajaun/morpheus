import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  KeyboardController,
  useGenericKeyboardHandler,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import { isTrayInstrumentationEnabled } from "../../telemetry/config";
import { markTrayStepKeyboardGate } from "../../telemetry/tray-step-timing";
import {
  openTrayKeyboardGate,
  type TrayKeyboardGate,
} from "../transition-start";
import { useSheetTrayKeyboard } from "../input/use-tray-keyboard";
import {
  resolveKeyboardDismissTiming,
  resolveKeyboardSheetTransitionIntent,
} from "../input/keyboard-transition";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import { TrayKeyboardGateContext } from "./contexts";
import { type TrayVisualViewProps } from "./props";
import { TrayVisualViewBody } from "./view-body";

export const TrayKeyboardCapableVisualView = React.memo(
  (props: TrayVisualViewProps) => {
    const keyboardTransitionIntent = resolveKeyboardSheetTransitionIntent(
      props.transitionContract,
    );
    const keyboardArmedGeneration = useSharedValue(0);
    const keyboardStartedGeneration = useSharedValue(0);
    const keyboardArmedTarget = useSharedValue(1);
    const keyboardGateWaitStartedAt = useSharedValue(0);
    const keyboardGateOpenedAt = useSharedValue(0);
    const keyboardGateOpenedBy = useSharedValue(0);
    const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
    // generation of a step that puts the keyboard away and has not dismissed it yet
    const pendingKeyboardDismissRef = useRef(0);
    const dismissKeyboardForLayout = useCallback((generation: number) => {
      if (
        pendingKeyboardDismissRef.current === 0 ||
        pendingKeyboardDismissRef.current !== generation
      ) {
        return;
      }

      pendingKeyboardDismissRef.current = 0;
      void KeyboardController.dismiss({ keepFocus: false, animated: true });
    }, []);
    const keyboardGate = useMemo<TrayKeyboardGate>(
      () => ({
        armedGeneration: keyboardArmedGeneration,
        startedGeneration: keyboardStartedGeneration,
        armedTarget: keyboardArmedTarget,
        keyboardProgress,
        onLayoutReady: dismissKeyboardForLayout,
        waitStartedAt: keyboardGateWaitStartedAt,
        openedAt: keyboardGateOpenedAt,
        openedBy: keyboardGateOpenedBy,
      }),
      [
        keyboardGateOpenedAt,
        keyboardGateOpenedBy,
        keyboardGateWaitStartedAt,
        dismissKeyboardForLayout,
        keyboardArmedGeneration,
        keyboardArmedTarget,
        keyboardProgress,
        keyboardStartedGeneration,
      ],
    );
    const keyboardGateGeneration =
      props.visible &&
      (keyboardTransitionIntent.entersKeyboard ||
        keyboardTransitionIntent.leavesKeyboard)
        ? (props.transitionContract?.generation ?? 0)
        : 0;
    const keyboardGateTarget = keyboardTransitionIntent.entersKeyboard ? 1 : 0;

    // arm on the step commit, the sheet layout starts frames later so the gate is armed before any check
    useLayoutEffect(() => {
      if (
        keyboardGateGeneration <= 0 ||
        keyboardGateGeneration === keyboardArmedGeneration.value
      ) {
        return;
      }

      // the shell's layout participant exists exactly when sheet layout animation is on, see shell.tsx
      const dismissTiming = resolveKeyboardDismissTiming({
        leavesKeyboard: keyboardGateTarget === 0,
        layoutParticipant: props.state.layoutEnabled,
      });

      // a step that keeps or brings the keyboard drops an older pending dismissal
      pendingKeyboardDismissRef.current =
        dismissTiming === "withLayout" ? keyboardGateGeneration : 0;

      if (dismissTiming === "now") {
        void KeyboardController.dismiss({ keepFocus: false, animated: true });
      }

      keyboardGateWaitStartedAt.value = 0;
      keyboardGateOpenedAt.value = 0;
      keyboardGateOpenedBy.value = 0;
      keyboardArmedTarget.value = keyboardGateTarget;
      keyboardArmedGeneration.value = keyboardGateGeneration;
    }, [
      keyboardGateOpenedAt,
      keyboardGateOpenedBy,
      keyboardGateWaitStartedAt,
      keyboardArmedGeneration,
      keyboardArmedTarget,
      keyboardGateGeneration,
      keyboardGateTarget,
      props.state.layoutEnabled,
    ]);

    // report how and when the gate opened to the step trace
    const gateInstrumented = isTrayInstrumentationEnabled();
    const rootTrayId = props.rootTrayId;
    const reportKeyboardGate = useCallback(
      (waitStartedAt: number, openedAt: number, openedBy: number) => {
        markTrayStepKeyboardGate(rootTrayId, waitStartedAt, openedAt, openedBy);
      },
      [rootTrayId],
    );

    useAnimatedReaction(
      () => (gateInstrumented ? keyboardGateOpenedBy.value : 0),
      (openedBy, previous) => {
        if (openedBy > 0 && openedBy !== previous) {
          scheduleOnRN(
            reportKeyboardGate,
            keyboardGateWaitStartedAt.value,
            keyboardGateOpenedAt.value,
            openedBy,
          );
        }
      },
      [gateInstrumented, reportKeyboardGate],
    );

    // the keyboard start runs on the UI thread on the frame it moves, the frame sheet and content start on too
    useGenericKeyboardHandler(
      {
        onStart: () => {
          "worklet";

          openTrayKeyboardGate(keyboardGate);
        },
      },
      [keyboardGate],
    );
    const keyboard = useSheetTrayKeyboard({
      rootTrayId: props.rootTrayId,
      visible: props.visible,
      keyboardAware: !props.fullScreen && (props.keyboardAware ?? false),
      targetKeyboardAware:
        keyboardTransitionIntent.isSheetStepTransition &&
        keyboardTransitionIntent.targetOwnsKeyboard,
      sheetStepTransition: keyboardTransitionIntent.isSheetStepTransition,
      transitionGeneration: props.transitionContract?.generation,
    });
    const isFullScreenBoundaryTransition =
      props.transitionContract?.fullScreenChanged ?? false;
    const keyboardStepTransition =
      keyboardTransitionIntent.isSheetStepTransition &&
      (keyboardTransitionIntent.sourceOwnsKeyboard ||
        keyboardTransitionIntent.targetOwnsKeyboard);

    useEffect(() => {
      if (!isTrayDebugLoggingEnabled()) {
        return;
      }

      log("KEYBOARD STEP CLASSIFICATION", {
        trayId: props.trayId,
        fromStep: props.transitionContract?.from?.stepKey,
        toStep: props.transitionContract?.to?.stepKey,
        fromKeyboardAware:
          props.transitionContract?.from?.keyboardAware ?? false,
        toKeyboardAware: props.transitionContract?.to?.keyboardAware ?? false,
        fromMode: props.transitionContract?.from?.mode,
        toMode: props.transitionContract?.to?.mode,
        fullScreenChanged: isFullScreenBoundaryTransition,
        keyboardStepTransition,
        visible: props.visible,
        presentationFullScreen: props.state.renderedFullScreen,
        stickyEnabled: keyboard.stickyEnabled,
      });
    }, [
      isFullScreenBoundaryTransition,
      keyboard.stickyEnabled,
      keyboardStepTransition,
      props.state.renderedFullScreen,
      props.trayId,
      props.transitionContract,
      props.visible,
    ]);

    return (
      <TrayKeyboardGateContext.Provider value={keyboardGate}>
        <TrayVisualViewBody
          {...props}
          keyboardStickyEnabled={keyboard.stickyEnabled}
        />
      </TrayKeyboardGateContext.Provider>
    );
  },
);

TrayKeyboardCapableVisualView.displayName = "TrayKeyboardCapableVisualView";
