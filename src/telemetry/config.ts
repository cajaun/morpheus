// Keep diagnostics opt-in. Set this to true only for a profiling run.
export const TRAY_INSTRUMENTATION_ENABLED = true;

// allow diagnostics only in development when the feature flag is enabled
export const isTrayInstrumentationEnabled = () =>
  __DEV__ && TRAY_INSTRUMENTATION_ENABLED;
 
