import { describe, expect, it } from "@jest/globals";
import { resolveTrayStepOptions } from "../tray-context";

describe("resolveTrayStepOptions", () => {
  it("resolves an optional fullscreen background scale", () => {
    expect(
      resolveTrayStepOptions({ fullScreenBackgroundScale: 0.94 })
        .fullScreenBackgroundScale,
    ).toBe(0.94);
    expect(resolveTrayStepOptions().fullScreenBackgroundScale).toBe(1);
    expect(
      resolveTrayStepOptions({ fullScreenBackgroundScale: Number.NaN })
        .fullScreenBackgroundScale,
    ).toBe(1);
  });
});
