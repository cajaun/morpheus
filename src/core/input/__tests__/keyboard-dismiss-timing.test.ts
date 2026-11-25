// a step that puts the keyboard away dismisses it with its layout, or at once when no layout participant will run
import { describe, expect, it } from "@jest/globals";
import { resolveKeyboardDismissTiming } from "../keyboard-transition";

describe("keyboard dismissal timing", () => {
  it("waits for the layout participant when the sheet layout animates", () => {
    expect(
      resolveKeyboardDismissTiming({ leavesKeyboard: true, layoutParticipant: true }),
    ).toBe("withLayout");
  });

  it("dismisses at once when no layout participant will start", () => {
    expect(
      resolveKeyboardDismissTiming({ leavesKeyboard: true, layoutParticipant: false }),
    ).toBe("now");
  });

  it("leaves the keyboard alone for a step that keeps or brings it", () => {
    expect(
      resolveKeyboardDismissTiming({ leavesKeyboard: false, layoutParticipant: false }),
    ).toBe("none");
  });
});
