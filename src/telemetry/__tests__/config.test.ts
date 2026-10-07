import { describe, expect, it } from "@jest/globals";
import { TRAY_INSTRUMENTATION_ENABLED } from "../config";

// guard the default diagnostics switch so timing logs stay opt in
describe("tray instrumentation config", () => {
  it("keeps diagnostics opt in by default", () => {
    expect(TRAY_INSTRUMENTATION_ENABLED).toBe(false);
  });
});
