// Keep diagnostics opt-in. Set this to true only for a profiling run.
export const TRAY_INSTRUMENTATION_ENABLED = true;

// allow diagnostics only in development when the feature flag is enabled
export const isTrayInstrumentationEnabled = () =>
  __DEV__ && TRAY_INSTRUMENTATION_ENABLED;

// Measure newly committed step content synchronously in the commit that
// mounts it (Fabric) instead of waiting for the native onLayout round trip.
// Disabled: the sheet morph is a Reanimated layout transition that starts
// only when a React commit changes native layout. Writing the target height
// early applies it before that commit lands, so the transition (and the
// step's entering animation, which waits on its clock) never starts. Only
// enable once geometry is driven by shared values instead of layout
// transitions.
export const TRAY_SYNC_CONTENT_MEASUREMENT_ENABLED = false;
