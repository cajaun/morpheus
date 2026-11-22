import { type SharedValue } from "react-native-reanimated";

// a keyboard step arms the gate with its generation and the keyboard's UI-thread start signal opens it, so shell, content and keyboard start on one frame
export type TrayKeyboardGate = {
  armedGeneration: SharedValue<number>;
  startedGeneration: SharedValue<number>;
  // 1 when the armed step brings the keyboard up, 0 when it puts it away
  armedTarget: SharedValue<number>;
  // the keyboard's UI-thread progress, a keyboard already moving opens the gate even if its start signal came before arming
  keyboardProgress: SharedValue<number>;
  // runs when an armed step's layout is ready to move, a step that puts the keyboard away dismisses it here so it starts with the sheet
  onLayoutReady?: (generation: number) => void;
  // diagnostics reset on arming, wait start, open time and opener (1 start signal, 2 progress already moving, 3 wait limit)
  waitStartedAt?: SharedValue<number>;
  openedAt?: SharedValue<number>;
  openedBy?: SharedValue<number>;
};

export const recordTrayKeyboardGateOpened = (
  gate: TrayKeyboardGate,
  by: number,
  at: number,
) => {
  "worklet";

  if (gate.openedBy && gate.openedAt && gate.openedBy.value === 0) {
    gate.openedAt.value = at;
    gate.openedBy.value = by;
  }
};

// a keyboard that never moves cannot hold the transition, real keyboard starts land 25-35 ms after the sheet
export const TRAY_KEYBOARD_GATE_MAX_WAIT_MS = 120;

// open the gate from the keyboard's UI-thread start signal
export const openTrayKeyboardGate = (gate: TrayKeyboardGate) => {
  "worklet";

  if (gate.startedGeneration.value !== gate.armedGeneration.value) {
    recordTrayKeyboardGateOpened(gate, 1, performance.now());
  }

  gate.startedGeneration.value = gate.armedGeneration.value;
};

export const isTrayKeyboardGateClosed = (
  gate: TrayKeyboardGate | undefined,
  generation: number,
) => {
  "worklet";

  // exact generation match, a restarted tray or an earlier armed step never holds an unrelated transition
  if (
    gate === undefined ||
    gate.armedGeneration.value !== generation ||
    gate.startedGeneration.value === generation
  ) {
    return false;
  }

  const keyboardStartProgress = 1 - gate.armedTarget.value;
  const closed =
    Math.abs(gate.keyboardProgress.value - keyboardStartProgress) < 0.01;

  if (!closed) {
    recordTrayKeyboardGateOpened(gate, 2, performance.now());
  }

  return closed;
};
