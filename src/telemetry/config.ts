// enabled temporarily while diagnosing tray timing
export const ACTION_TRAY_INSTRUMENTATION_ENABLED = true;

// allow diagnostics only in development when the feature flag is enabled
export const isActionTrayInstrumentationEnabled = () =>
  __DEV__ && ACTION_TRAY_INSTRUMENTATION_ENABLED;
