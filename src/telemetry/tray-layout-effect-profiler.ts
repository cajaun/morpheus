import {
  useLayoutEffect,
  type DependencyList,
  type EffectCallback,
} from "react";
import { isTrayInstrumentationEnabled } from "./config";

const MIN_REPORTED_DURATION_MS = 0.25;
const MAX_RECORDED_EVENTS = 4096;

type TrayLayoutEffectProfileEvent = {
  label: string;
  startedAtMs: number;
  durationMs: number;
};

type TrayLayoutEffectProfile = {
  events: TrayLayoutEffectProfileEvent[];
  clear: () => void;
  flush: () => string;
};

const profileGlobal = globalThis as typeof globalThis & {
  __TRAY_LAYOUT_EFFECT_PROFILE__?: TrayLayoutEffectProfile;
};

const profile: TrayLayoutEffectProfile =
  profileGlobal.__TRAY_LAYOUT_EFFECT_PROFILE__ ?? {
    events: [],
    clear() {
      this.events.length = 0;
    },
    flush() {
      const serialized = JSON.stringify(this.events);
      console.log("[TrayLayoutEffectProfile]", serialized);
      return serialized;
    },
  };

if (__DEV__) {
  profileGlobal.__TRAY_LAYOUT_EFFECT_PROFILE__ = profile;
}

// Temporary dev-only timing to identify slow tray commit effects. Store
// records in memory: console logging inside a layout effect is itself charged
// to React's effect duration and can distort the profile. Call
// globalThis.__TRAY_LAYOUT_EFFECT_PROFILE__.flush() after capture to export.
export const useProfiledTrayLayoutEffect = (
  label: string,
  effect: EffectCallback,
  dependencies: DependencyList,
) => {
  // Callers provide the dependency list for the effect body; keeping that
  // list explicit preserves each existing effect's scheduling semantics.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!isTrayInstrumentationEnabled()) {
      return effect();
    }

    const startedAt = performance.now();

    try {
      return effect();
    } finally {
      const durationMs = performance.now() - startedAt;

      if (durationMs >= MIN_REPORTED_DURATION_MS) {
        profile.events.push({
          label,
          startedAtMs: Number(startedAt.toFixed(2)),
          durationMs: Number(durationMs.toFixed(2)),
        });

        if (profile.events.length > MAX_RECORDED_EVENTS) {
          profile.events.splice(0, profile.events.length - MAX_RECORDED_EVENTS);
        }
      }
    }
  }, dependencies);
};
