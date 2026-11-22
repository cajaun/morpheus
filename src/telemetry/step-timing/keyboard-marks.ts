import { isTrayInstrumentationEnabled } from "../config";
import { tracesByRootTrayId, now } from "./trace-store";

// the first point navigation knows the next step needs the keyboard
export const markTrayStepKeyboardIntent = (rootTrayId?: string | null) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardIntentAt === undefined) {
    trace.keyboardIntentAt = now();
  }
};

// a step's input calls focus(), before native focus
export const markTrayStepKeyboardFocusRequested = (
  rootTrayId?: string | null,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardFocusRequestedAt === undefined) {
    trace.keyboardFocusRequestedAt = now();
  }
};

// the keyboard gate's UI-thread timings for the current trace
export const markTrayStepKeyboardGate = (
  rootTrayId: string | null | undefined,
  waitStartedAt: number,
  openedAt: number,
  openedBy: number,
) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardGateOpenedAt === undefined) {
    trace.keyboardGateWaitStartedAt =
      waitStartedAt > 0 ? waitStartedAt : undefined;
    trace.keyboardGateOpenedAt = openedAt;
    trace.keyboardGateOpenedBy = openedBy;
  }
};

// native input focus without logging every keyboard frame
export const markTrayStepKeyboardFocus = (rootTrayId?: string | null) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardFocusAt === undefined) {
    trace.keyboardFocusAt = now();
  }
};

// the native keyboard animation boundary KeyboardStickyView uses
export const markTrayStepKeyboardWillShow = (rootTrayId?: string | null) => {
  if (!isTrayInstrumentationEnabled() || !rootTrayId) {
    return;
  }

  const trace = tracesByRootTrayId.get(rootTrayId);

  if (trace && trace.keyboardWillShowAt === undefined) {
    trace.keyboardWillShowAt = now();
  }
};
