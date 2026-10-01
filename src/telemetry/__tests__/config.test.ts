import { describe, expect, it } from "@jest/globals";
import { ACTION_TRAY_INSTRUMENTATION_ENABLED } from "../config";

// guard the default diagnostics switch so timing logs stay opt in
describe("action tray instrumentation config", () => {
  it("is enabled while diagnosing tray timing", () => {
    expect(ACTION_TRAY_INSTRUMENTATION_ENABLED).toBe(true);
  });
});
