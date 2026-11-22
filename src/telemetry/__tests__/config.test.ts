import { describe, expect, it } from "@jest/globals";
import { TRAY_INSTRUMENTATION_ENABLED } from "../config";

// the default diagnostics switch stays off so timing logs are opt-in
describe("tray instrumentation config", () => {
  it("keeps diagnostics opt in by default", () => {
    expect(TRAY_INSTRUMENTATION_ENABLED).toBe(false);
  });
});
