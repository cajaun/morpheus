import { describe, expect, it } from "@jest/globals";
import { ACTION_TRAY_INSTRUMENTATION_ENABLED } from "../config";

describe("action tray instrumentation config", () => {
  it("is disabled by default", () => {
    expect(ACTION_TRAY_INSTRUMENTATION_ENABLED).toBe(false);
  });
});
