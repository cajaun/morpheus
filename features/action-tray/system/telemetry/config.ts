// flip this only while diagnosing tray timing
export const ACTION_TRAY_INSTRUMENTATION_ENABLED = false;

export const isActionTrayInstrumentationEnabled = () =>
  __DEV__ && ACTION_TRAY_INSTRUMENTATION_ENABLED;
