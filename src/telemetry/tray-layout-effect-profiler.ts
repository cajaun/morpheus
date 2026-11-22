import {
  useLayoutEffect,
  type DependencyList,
  type EffectCallback,
} from "react";
import { isTrayInstrumentationEnabled } from "./config";
import { recordTrayTelemetry } from "./tray-telemetry-buffer";

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

// dev-only timing of slow commit effects, records stay in memory, flush via globalThis.__TRAY_LAYOUT_EFFECT_PROFILE__
export const useProfiledTrayLayoutEffect = (
  label: string,
  effect: EffectCallback,
  dependencies: DependencyList,
) => {
  // callers provide the dependency list so each effect keeps its scheduling
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
        recordTrayTelemetry("TrayLayoutEffect", {
          label,
          durationMs: Number(durationMs.toFixed(2)),
        });

        if (profile.events.length > MAX_RECORDED_EVENTS) {
          profile.events.splice(0, profile.events.length - MAX_RECORDED_EVENTS);
        }
      }
    }
  }, dependencies);
};
