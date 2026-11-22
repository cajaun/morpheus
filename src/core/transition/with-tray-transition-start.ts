import {
  defineAnimation,
  type AnimatableValue,
  type Animation,
  type AnimationObject,
  type SharedValue,
} from "react-native-reanimated";
import { logWorklet } from "../logger";
import {
  recordTrayKeyboardGateOpened,
  TRAY_KEYBOARD_GATE_MAX_WAIT_MS,
  isTrayKeyboardGateClosed,
  type TrayKeyboardGate,
} from "./keyboard-gate";
import {
  type TrayTransitionParticipant,
  type TrayTransitionStartSignal,
} from "./transition-start-context";

// publish the start for participants that join later
export const publishTrayTransitionStart = (
  startedGeneration: SharedValue<number>,
  startedAt: SharedValue<number>,
  generation: number,
  at: number,
) => {
  "worklet";

  if (generation > startedGeneration.value) {
    // the timestamp lands before the generation so joining participants read a complete clock record
    startedAt.value = at;
    startedGeneration.value = generation;
  }
};

// record completion once so late callbacks never move the clock backwards
export const completeTrayTransition = (
  completedGeneration: SharedValue<number>,
  generation: number,
) => {
  "worklet";

  if (generation > completedGeneration.value) {
    completedGeneration.value = generation;
  }
};

export interface TransitionStartAnimation extends Animation<TransitionStartAnimation> {
  current: AnimatableValue;
  previousAnimation: AnimationObject | null;
  layoutStartedGeneration: SharedValue<number>;
  completedGeneration: SharedValue<number>;
  waitingForStart: boolean;
  started: boolean;
  gateWaitStartedAt: number;
  framesHeld: number;
  diagnosticStarted: boolean;
  diagnosticCompleted: boolean;
}

export type WithTrayTransitionStart = <T extends AnimatableValue>(
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
  startHoldFrames?: number,
) => T;

// join every participant to one UI-thread clock
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
  // layout participant UI frames to hold before starting, so native work for new content lands before anything moves
  startHoldFrames = 0,
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
        const layoutNotStarted = layoutStartedGeneration.value < generation;
        const keyboardGateClosed =
          participant === "layout" &&
          isTrayKeyboardGateClosed(keyboardGate, generation);
        const keyboardNotStarted =
          keyboardGateClosed &&
          now - animation.gateWaitStartedAt < TRAY_KEYBOARD_GATE_MAX_WAIT_MS;

        if (keyboardGate?.waitStartedAt && keyboardNotStarted) {
          if (keyboardGate.waitStartedAt.value === 0) {
            keyboardGate.waitStartedAt.value = now;
          }
        } else if (keyboardGate && keyboardGateClosed) {
          recordTrayKeyboardGateOpened(keyboardGate, 3, now);
        }
        if (
          !completed &&
          ((waitForClock && clockNotStarted) ||
            (waitForLayoutStart && layoutNotStarted) ||
            keyboardNotStarted)
        ) {
          animation.waitingForStart = true;
          return;
        }

        if (
          participant === "layout" &&
          !completed &&
          animation.framesHeld < startHoldFrames
        ) {
          animation.framesHeld += 1;
          animation.waitingForStart = true;
          return;
        }

        // content waits for the layout start, so it publishes once the layout is free to move
        if (participant === "layout" && !completed) {
          layoutStartedGeneration.value = Math.max(
            layoutStartedGeneration.value,
            generation,
          );
        }

        const hasSameGeneration =
          !completed && startedGeneration.value === generation;
        const innerStartedAt = hasSameGeneration ? startedAt.value : now;

        const publishedClock =
          !completed && startedGeneration.value < generation;

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
          // start signals are worklets and each caller schedules its own JS work, scheduling the callback itself hits a stale Worklets hash
          onStartSignal(innerStartedAt, generation, now);
        }
      };

      const onFrame = (
        animation: TransitionStartAnimation,
        now: number,
      ): boolean => {
        if (!animation.started) {
          if (animation.waitingForStart) {
            // re-check every wait condition including the keyboard gate
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
              layoutStartedGeneration: animation.layoutStartedGeneration.value,
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
        framesHeld: 0,
        diagnosticStarted: false,
        diagnosticCompleted: false,
      };
    },
  );
} as WithTrayTransitionStart;
