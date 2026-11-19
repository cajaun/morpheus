import { createContext, useContext } from "react";
import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";
import { logWorklet } from "./logger";

export type TrayTransitionStart = {
  generation: number;
  fullScreenChanged: boolean;
  // True only when this transition has a shell/layout participant that must
  // open the content barrier before incoming and outgoing motion starts.
  // Keeping this explicit prevents content from waiting for a layout event
  // that native layout never scheduled.
  layoutStartRequired?: boolean;
  generationValue: SharedValue<number>;
  fullScreenChangedValue: SharedValue<number>;
  morphProgress?: SharedValue<number>;
  startedAt: SharedValue<number>;
  startedGeneration: SharedValue<number>;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  // Immutable policy captured with the transition so sheet keyboard handoffs
  // cannot race a late shared-value update on the UI thread.
  keyboardStepTransition?: boolean;
};

export type TrayTransitionParticipant = "incoming" | "outgoing" | "layout";

// A sheet step that brings up or puts away the keyboard is armed with its
// generation. The keyboard's own UI-thread start signal then opens the gate,
// so the shell layout, the content and the keyboard begin on the same frame.
// The layout participant holds the shared clock while the gate is armed and
// closed; content already waits for the layout start, so it follows.
export type TrayKeyboardGate = {
  armedGeneration: SharedValue<number>;
  startedGeneration: SharedValue<number>;
  // 1 when the armed step brings the keyboard up, 0 when it puts it away
  armedTarget: SharedValue<number>;
  // the keyboard's own UI-thread progress (0 hidden, 1 shown). A keyboard
  // that has already left its start position opens the gate even if its start
  // signal arrived before the gate was armed.
  keyboardProgress: SharedValue<number>;
  // JS callback run when the layout for an armed step is ready to move. A step
  // that puts the keyboard away dismisses it here, so the keyboard starts with
  // the sheet instead of at the step commit, ahead of the sheet's layout.
  onLayoutReady?: (generation: number) => void;
};

// A keyboard that never moves (no input focused, or a hardware keyboard with
// no on-screen keyboard) must not hold the transition. Measured keyboard
// starts land about 25-35 ms after the sheet would start, so this only ever
// releases a gate whose keyboard is not coming.
export const TRAY_KEYBOARD_GATE_MAX_WAIT_MS = 120;

// open the gate from the keyboard's UI-thread start signal
export const openTrayKeyboardGate = (gate: TrayKeyboardGate) => {
  "worklet";

  gate.startedGeneration.value = gate.armedGeneration.value;
};

const isTrayKeyboardGateClosed = (
  gate: TrayKeyboardGate | undefined,
  generation: number,
) => {
  "worklet";

  // exact generation match: a tray whose generations restart, or an earlier
  // armed step, can never hold an unrelated transition
  if (
    gate === undefined ||
    gate.armedGeneration.value !== generation ||
    gate.startedGeneration.value === generation
  ) {
    return false;
  }

  const keyboardStartProgress = 1 - gate.armedTarget.value;

  return Math.abs(gate.keyboardProgress.value - keyboardStartProgress) < 0.01;
};

// startedAt is the shared clock start this participant follows; joinedAt is
// the frame it actually started on. Both come from the UI frame clock, so
// joinedAt - startedAt is how late the participant joined the transition.
export type TrayTransitionStartSignal = (
  startedAt: number,
  generation: number,
  joinedAt: number,
) => void;

const TrayTransitionStartContext =
  createContext<TrayTransitionStart | null>(null);

export const TrayTransitionStartProvider = TrayTransitionStartContext.Provider;

// read the transition clock shared by shell and content participants
export const useTrayTransitionStart = () =>
  useContext(TrayTransitionStartContext);

// resolve the newest generation across render and ui thread state
export const resolveTrayTransitionGeneration = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  // let the descriptor lead until the shared generation catches up
  if (descriptorGeneration <= 0) {
    return 0;
  }

  return Math.max(
    descriptorGeneration,
    transitionStart?.generationValue.value ?? 0,
  );
};

// resolve fullscreen change from the descriptor until shared state catches up
export const resolveTrayTransitionFullScreenChanged = (
  transitionStart: TrayTransitionStart | null,
) => {
  "worklet";

  const descriptorGeneration = transitionStart?.generation ?? 0;

  if (descriptorGeneration <= 0) {
    return false;
  }

  const sharedGeneration = transitionStart?.generationValue.value ?? 0;
  const sharedFullScreenChanged =
    transitionStart?.fullScreenChangedValue.value ?? 0;

  // use descriptor fullscreen state until the shared generation advances
  return (
    (sharedGeneration > descriptorGeneration
      ? sharedFullScreenChanged
      : transitionStart?.fullScreenChanged
        ? 1
        : 0) > 0
  );
};

// Content waits for the shell only when the transition has an actual shell
// participant. A transition descriptor alone is not evidence that native
// layout scheduled an animation, so this cannot be inferred from generation
// alone.
export const shouldWaitForTrayLayoutStart = (
  transitionStart: TrayTransitionStart | null,
  generation: number,
) => {
  "worklet";

  return (
    transitionStart?.layoutStartRequired === true && generation > 0
  );
};

// publish the timestamp before the generation for joining participants
export const publishTrayTransitionStart = (
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  generation: number,
  at: number,
) => {
  "worklet";

  if (generation > startedGeneration.value) {
    // publish the timestamp before the generation so joining participants see a complete clock record when they observe the generation
    startedAt.value = at;
    startedGeneration.value = generation;
  }
};

// record completion once so late callbacks cannot move the clock backwards
export const completeTrayTransition = (
  completedGeneration: SharedValue<number>,
  generation: number,
) => {
  "worklet";

  if (generation > completedGeneration.value) {
    completedGeneration.value = generation;
  }
};

interface TransitionStartAnimation
  extends Animation<TransitionStartAnimation> {
  current: AnimatableValue;
  previousAnimation: AnimationObject | null;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  waitingForStart: boolean;
  started: boolean;
  gateWaitStartedAt: number;
  diagnosticStarted: boolean;
  diagnosticCompleted: boolean;
}

type WithTrayTransitionStart = <T extends AnimatableValue>(
  nextAnimation: T,
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  layoutStartedGeneration: SharedValue<number>,
  completedGeneration: SharedValue<number>,
  generation: number,
  participant: TrayTransitionParticipant,
  onStartSignal?: TrayTransitionStartSignal,
  waitForClock?: boolean,
  waitForLayoutStart?: boolean,
  keyboardGate?: TrayKeyboardGate,
) => T;

// join every participant to one ui thread clock
export const withTrayTransitionStart = function <T extends AnimationObject>(
  nextAnimationInput: T | (() => T),
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  layoutStartedGeneration: SharedValue<number>,
  completedGeneration: SharedValue<number>,
  generation: number,
  participant: TrayTransitionParticipant,
  onStartSignal?: TrayTransitionStartSignal,
  waitForClock = false,
  waitForLayoutStart = false,
  keyboardGate?: TrayKeyboardGate,
): Animation<TransitionStartAnimation> {
  "worklet";

  return defineAnimation<TransitionStartAnimation, T>(
    nextAnimationInput,
    () => {
      "worklet";

      const nextAnimation =
        typeof nextAnimationInput === "function"
          ? nextAnimationInput()
          : nextAnimationInput;

      const startInnerAnimation = (
        animation: TransitionStartAnimation,
        value: AnimatableValue,
        now: number,
      ) => {
        const completed = completedGeneration.value >= generation;
        const clockNotStarted = startedGeneration.value < generation;
        const layoutNotStarted =
          layoutStartedGeneration.value < generation;
        const keyboardNotStarted =
          participant === "layout" &&
          isTrayKeyboardGateClosed(keyboardGate, generation) &&
          now - animation.gateWaitStartedAt < TRAY_KEYBOARD_GATE_MAX_WAIT_MS;
        if (
          !completed &&
          ((waitForClock && clockNotStarted) ||
            (waitForLayoutStart && layoutNotStarted) ||
            keyboardNotStarted)
        ) {
          animation.waitingForStart = true;
          return;
        }

        // the layout start is what content waits for, so it is published only
        // once the layout itself is free to move
        if (participant === "layout" && !completed) {
          layoutStartedGeneration.value = Math.max(
            layoutStartedGeneration.value,
            generation,
          );
        }

        const hasSameGeneration =
          !completed && startedGeneration.value === generation;
        const innerStartedAt = hasSameGeneration
          ? startedAt.value
          : now;

        const publishedClock = !completed && startedGeneration.value < generation;

        if (publishedClock) {
          publishTrayTransitionStart(
            startedGeneration,
            startedAt,
            generation,
            now,
          );
        }

        nextAnimation.onStart(
          nextAnimation,
          value,
          innerStartedAt,
          animation.previousAnimation,
        );
        animation.current = nextAnimation.current ?? value;
        animation.waitingForStart = false;
        animation.started = true;

        if (!animation.diagnosticStarted) {
          animation.diagnosticStarted = true;
          logWorklet("TRANSITION PARTICIPANT START", {
            generation,
            participant,
            waitForClock,
            waitForLayoutStart,
            publishedClock,
            completed,
            clockStartedGeneration: startedGeneration.value,
            clockStartedAt: startedAt.value,
            innerStartedAt,
            now,
          });
        }

        if (onStartSignal) {
          // Start signals are worklet callbacks. Each caller is responsible
          // for scheduling its JS-side work, if needed; sending the callback
          // itself through scheduleOnRN makes Worklets look up a stale hash.
          onStartSignal(innerStartedAt, generation, now);
        }
      };

      const onFrame = (
        animation: TransitionStartAnimation,
        now: number,
      ): boolean => {
        if (!animation.started) {
          if (animation.waitingForStart) {
            // re-checks every wait condition, including the keyboard gate
            startInnerAnimation(animation, animation.current, now);
          }

          if (!animation.started) {
            return false;
          }
        }

        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current ?? animation.current;

        if (
          finished &&
          (participant === "layout" ||
            (participant === "incoming" &&
              animation.layoutStartedGeneration.value < generation))
        ) {
          if (!animation.diagnosticCompleted) {
            animation.diagnosticCompleted = true;
            logWorklet("TRANSITION PARTICIPANT COMPLETE", {
              generation,
              participant,
              clockStartedGeneration: startedGeneration.value,
              clockStartedAt: startedAt.value,
              layoutStartedGeneration:
                animation.layoutStartedGeneration.value,
              completedGeneration: animation.completedGeneration.value,
              now,
            });
          }
          completeTrayTransition(animation.completedGeneration, generation);
        }

        return finished;
      };

      const onStart = (
        animation: TransitionStartAnimation,
        value: AnimatableValue,
        now: number,
        previousAnimation: AnimationObject | null,
      ) => {
        if (nextAnimation.reduceMotion === undefined) {
          nextAnimation.reduceMotion = animation.reduceMotion;
        }

        animation.current = value;
        animation.previousAnimation = previousAnimation;
        animation.gateWaitStartedAt = now;

        startInnerAnimation(animation, value, now);
      };

      const callback = (finished?: boolean) => {
        nextAnimation.callback?.(finished);
      };

      return {
        isHigherOrder: true,
        onFrame,
        onStart,
        current: nextAnimation.current!,
        callback,
        previousAnimation: null,
        layoutStartedGeneration,
        completedGeneration,
        waitingForStart: false,
        started: false,
        gateWaitStartedAt: 0,
        diagnosticStarted: false,
        diagnosticCompleted: false,
      };
    },
  );
} as WithTrayTransitionStart;
