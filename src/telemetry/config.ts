// enabled temporarily while diagnosing tray timing
export const TRAY_INSTRUMENTATION_ENABLED = false;

// allow diagnostics only in development when the feature flag is enabled
export const isTrayInstrumentationEnabled = () =>
  __DEV__ && TRAY_INSTRUMENTATION_ENABLED;
 
