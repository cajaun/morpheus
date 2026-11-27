// the per-open effect breakdown printed after each [TrayPerf] line
import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";

jest.mock("../config", () => ({
  isTrayInstrumentationEnabled: () => true,
}));

// eslint-disable-next-line import/first
import {
  logTrayEffectsBetween,
  useProfiledTrayEffect,
  useProfiledTrayLayoutEffect,
} from "../tray-layout-effect-profiler";

// busy-waits so an effect body has a measurable cost
const spin = (ms: number) => {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    // waiting
  }
};

describe("tray effect breakdown", () => {
  it("groups the effects inside the window by label, slowest first, split into layout and passive", () => {
    const startedAt = performance.now();

    const Probe = () => {
      useProfiledTrayLayoutEffect("probe/layout", () => spin(2), []);
      useProfiledTrayEffect("probe/passive", () => spin(4), []);
      return null;
    };

    act(() => {
      TestRenderer.create(<Probe />);
    });

    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    logTrayEffectsBetween("open", startedAt, performance.now());
    const printed = String(log.mock.calls.at(-1)?.[0] ?? "");
    log.mockRestore();

    expect(printed).toMatch(/^\[TrayEffects\] open layout=\d+\.\dms passive=\d+\.\dms/);
    const lines = printed.split("\n").slice(1);
    // the slower passive effect is listed first
    expect(lines[0]).toMatch(/passive probe\/passive$/);
    expect(lines[1]).toMatch(/layout probe\/layout$/);
  });

  it("leaves out effects outside the window", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    logTrayEffectsBetween("later", performance.now() + 1000, performance.now() + 2000);
    const printed = String(log.mock.calls.at(-1)?.[0] ?? "");
    log.mockRestore();

    expect(printed).toBe(
      "[TrayEffects] later layout=0.0ms passive=0.0ms (effects >= 0.25ms)",
    );
  });
});
