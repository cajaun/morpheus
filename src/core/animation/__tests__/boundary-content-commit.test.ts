// which boundary transitions wait for the target content commit
import { describe, expect, it, jest } from "@jest/globals";
import type { TrayTransitionContract } from "../../../runtime/types";

jest.mock("react-native-reanimated", () => ({}));
jest.mock("react-native-worklets", () => ({}));

// eslint-disable-next-line import/first
import { shouldBoundaryWaitForContentCommit } from "../use-tray-boundary-motion-state";

const contract = (
  overrides: Partial<TrayTransitionContract>,
): TrayTransitionContract =>
  ({
    generation: 5,
    fullScreenChanged: true,
    stepChanged: true,
    to: { mode: "sheet" },
    ...overrides,
  }) as unknown as TrayTransitionContract;

describe("shouldBoundaryWaitForContentCommit", () => {
  it("waits on a fullscreen-to-sheet step change", () => {
    expect(shouldBoundaryWaitForContentCommit(contract({}))).toBe(true);
  });

  it("does not wait entering fullscreen", () => {
    expect(
      shouldBoundaryWaitForContentCommit(
        contract({ to: { mode: "fullScreen" } } as never),
      ),
    ).toBe(false);
  });

  it("never waits when the step does not change, so the clock cannot stall", () => {
    expect(
      shouldBoundaryWaitForContentCommit(contract({ stepChanged: false })),
    ).toBe(false);
  });

  it("does not wait for ordinary sheet transitions", () => {
    expect(
      shouldBoundaryWaitForContentCommit(contract({ fullScreenChanged: false })),
    ).toBe(false);
    expect(shouldBoundaryWaitForContentCommit(null)).toBe(false);
  });
});
