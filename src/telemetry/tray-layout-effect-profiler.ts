import {
  useEffect,
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
  // layout effects run in the commit before paint, passive effects after it
  kind: "layout" | "passive";
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

// times one effect body while instrumentation is on, the effect itself runs unchanged
const runProfiledEffect = (
  kind: TrayLayoutEffectProfileEvent["kind"],
  label: string,
  effect: EffectCallback,
) => {
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
        kind,
        startedAtMs: Number(startedAt.toFixed(2)),
        durationMs: Number(durationMs.toFixed(2)),
      });
      recordTrayTelemetry("TrayLayoutEffect", {
        label,
        kind,
        durationMs: Number(durationMs.toFixed(2)),
      });

      if (profile.events.length > MAX_RECORDED_EVENTS) {
        profile.events.splice(0, profile.events.length - MAX_RECORDED_EVENTS);
      }
    }
  }
};

// dev-only timing of slow commit effects, records stay in memory, flush via globalThis.__TRAY_LAYOUT_EFFECT_PROFILE__
export const useProfiledTrayLayoutEffect = (
  label: string,
  effect: EffectCallback,
  dependencies?: DependencyList,
) => {
  // callers provide the dependency list so each effect keeps its scheduling
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => runProfiledEffect("layout", label, effect), dependencies);
};

// the same timing for passive effects, which run after the commit paints
export const useProfiledTrayEffect = (
  label: string,
  effect: EffectCallback,
  dependencies?: DependencyList,
) => {
  // callers provide the dependency list so each effect keeps its scheduling
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => runProfiledEffect("passive", label, effect), dependencies);
};

// the effects that ran inside one window of the clock, grouped by label and slowest first, printed after an open so its cost is attributable
export const logTrayEffectsBetween = (
  heading: string,
  startedAtMs: number,
  endedAtMs: number,
) => {
  if (!isTrayInstrumentationEnabled()) {
    return;
  }

  const totals = new Map<
    string,
    { kind: TrayLayoutEffectProfileEvent["kind"]; durationMs: number; runs: number }
  >();
  let layoutMs = 0;
  let passiveMs = 0;

  for (const event of profile.events) {
    if (event.startedAtMs < startedAtMs || event.startedAtMs > endedAtMs) {
      continue;
    }

    const total = totals.get(event.label) ?? {
      kind: event.kind,
      durationMs: 0,
      runs: 0,
    };
    total.durationMs += event.durationMs;
    total.runs += 1;
    totals.set(event.label, total);

    if (event.kind === "layout") {
      layoutMs += event.durationMs;
    } else {
      passiveMs += event.durationMs;
    }
  }

  const slowest = [...totals.entries()]
    .sort((left, right) => right[1].durationMs - left[1].durationMs)
    .slice(0, 15)
    .map(
      ([label, total]) =>
        `  ${total.durationMs.toFixed(1)}ms ${total.kind} ${label}${total.runs > 1 ? ` x${total.runs}` : ""}`,
    );

  console.log(
    [
      `[TrayEffects] ${heading} layout=${layoutMs.toFixed(1)}ms passive=${passiveMs.toFixed(1)}ms (effects >= ${MIN_REPORTED_DURATION_MS}ms)`,
      ...slowest,
    ].join("\n"),
  );
};
