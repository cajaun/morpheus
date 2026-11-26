// diagnostics stay opt-in, true for a profiling run
export const TRAY_INSTRUMENTATION_ENABLED = true;

// diagnostics run in development with the flag on
export const isTrayInstrumentationEnabled = () =>
  __DEV__ && TRAY_INSTRUMENTATION_ENABLED;

// off because an early synchronous height lands before the commit that starts the sheet's layout transition, enable once geometry runs on shared values
export const TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED = false;
