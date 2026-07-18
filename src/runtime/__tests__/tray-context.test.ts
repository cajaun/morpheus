import { describe, expect, it } from "@jest/globals";
import { DEFAULT_FULL_SCREEN_BACKGROUND_SCALE } from "../../core/constants";
import { resolveTrayStepOptions } from "../tray-context";

// probe runtime option normalization before presenter payload creation
describe("resolveTrayStepOptions", () => {
  it("keeps fullscreen background scale neutral by default", () => {
    expect(resolveTrayStepOptions().shouldScaleBackground).toBe(false);
    expect(resolveTrayStepOptions().fullScreenBackgroundScale).toBe(1);
    expect(
      resolveTrayStepOptions({ fullScreen: true }).fullScreenBackgroundScale,
    ).toBe(1);
    expect(
      resolveTrayStepOptions({
        fullScreen: true,
        fullScreenBackgroundScale: 0.94,
      }).fullScreenBackgroundScale,
    ).toBe(1);
    expect(
      resolveTrayStepOptions({ shouldScaleBackground: true })
        .shouldScaleBackground,
    ).toBe(false);
    expect(
      resolveTrayStepOptions({ shouldScaleBackground: true })
        .fullScreenBackgroundScale,
    ).toBe(1);
  });

  it("uses the computed fullscreen background scale when scaling is enabled", () => {
    const computedOptions = resolveTrayStepOptions({
      fullScreen: true,
      shouldScaleBackground: true,
    });

    expect(computedOptions.shouldScaleBackground).toBe(true);
    expect(computedOptions.fullScreenBackgroundScale).toBe(
      DEFAULT_FULL_SCREEN_BACKGROUND_SCALE,
    );
  });

  it("uses a valid fullscreen background scale override only when scaling is enabled", () => {
    expect(
      resolveTrayStepOptions({
        fullScreen: true,
        shouldScaleBackground: true,
        fullScreenBackgroundScale: 0.94,
      })
        .fullScreenBackgroundScale,
    ).toBe(0.94);
  });

  it("falls back to the computed scale when an enabled override is invalid", () => {
    expect(
      resolveTrayStepOptions({
        fullScreen: true,
        shouldScaleBackground: true,
        fullScreenBackgroundScale: Number.NaN,
      })
        .fullScreenBackgroundScale,
    ).toBe(DEFAULT_FULL_SCREEN_BACKGROUND_SCALE);
  });
});
