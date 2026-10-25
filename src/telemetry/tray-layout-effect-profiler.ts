import {
  useLayoutEffect,
  type DependencyList,
  type EffectCallback,
} from "react";

const MIN_REPORTED_DURATION_MS = 0.25;

// Temporary dev-only timing to identify slow tray commit effects. The clock
// stops before logging, and the original cleanup is returned unchanged.
export const useProfiledTrayLayoutEffect = (
  label: string,
  effect: EffectCallback,
  dependencies: DependencyList,
) => {
  // Callers provide the dependency list for the effect body; keeping that
  // list explicit preserves each existing effect's scheduling semantics.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!__DEV__) {
      return effect();
    }

    const startedAt = performance.now();

    try {
      return effect();
    } finally {
      const durationMs = performance.now() - startedAt;

      if (durationMs >= MIN_REPORTED_DURATION_MS) {
        console.log(
          "[TrayLayoutEffect]",
          JSON.stringify({
            label,
            startedAtMs: Number(startedAt.toFixed(2)),
            durationMs: Number(durationMs.toFixed(2)),
          }),
        );
      }
    }
  }, dependencies);
};
