import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimatableValue,
  AnimationObject,
  SharedValue,
} from "react-native-reanimated";
import {
  publishTrayTransitionStart,
  withTrayTransitionStart,
} from "../transition-start";

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual(
    "react-native-reanimated/mock",
  ) as Record<string, unknown>;

  return {
    ...Reanimated,
    defineAnimation: (_starting: unknown, factory: () => unknown) => factory(),
  };
});

jest.mock("react-native-worklets", () => {
  const Worklets = jest.requireActual(
    "react-native-worklets",
  ) as Record<string, unknown>;

  return {
    ...Worklets,
    scheduleOnRN: (
      callback: (...args: never[]) => unknown,
      ...args: never[]
    ) => callback(...args),
  };
});

const shared = (value: number) => ({ value }) as SharedValue<number>;

const createAnimation = () => {
  const animation: AnimationObject<number> = {
    current: 0,
    onStart: jest.fn(
      (
        currentAnimation: AnimationObject<number>,
        current: AnimatableValue,
      ) => {
        currentAnimation.current = current as number;
      },
    ),
    onFrame: jest.fn((currentAnimation: AnimationObject<number>) => {
      currentAnimation.current = 1;
      return true;
    }),
  };

  return animation;
};

describe("tray transition start synchronization", () => {
  it("lets the first participant establish the clock and later participants join it", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const first = createAnimation();
    const second = createAnimation();

    const firstParticipant = withTrayTransitionStart(
      first as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      7,
      "incoming",
    ) as unknown as AnimationObject<number>;
    const secondParticipant = withTrayTransitionStart(
      second as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      7,
      "layout",
    ) as unknown as AnimationObject<number>;

    firstParticipant.onStart(firstParticipant, 0, 100, null);
    secondParticipant.onStart(secondParticipant, 0, 130, null);

    expect(startedGeneration.value).toBe(7);
    expect(startedAt.value).toBe(100);
    expect(first.onStart).toHaveBeenCalledWith(first, 0, 100, null);
    expect(second.onStart).toHaveBeenCalledWith(second, 0, 100, null);
  });

  it("does not wait for a layout event when content is the first participant", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const content = createAnimation();
    const participant = withTrayTransitionStart(
      content as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      3,
      "incoming",
    ) as unknown as AnimationObject<number>;

    participant.onStart(participant, 0, 200, null);

    expect(startedGeneration.value).toBe(3);
    expect(startedAt.value).toBe(200);
    expect(participant.onFrame(participant, 216)).toBe(true);
    expect(content.onFrame).toHaveBeenCalledWith(content, 216);
  });

  it("keeps an outgoing participant from retiring the incoming clock", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const outgoing = createAnimation();
    const incoming = createAnimation();
    const outgoingParticipant = withTrayTransitionStart(
      outgoing as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      5,
      "outgoing",
    ) as unknown as AnimationObject<number>;
    const incomingParticipant = withTrayTransitionStart(
      incoming as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      5,
      "incoming",
    ) as unknown as AnimationObject<number>;

    outgoingParticipant.onStart(outgoingParticipant, 0, 220, null);
    expect(outgoingParticipant.onFrame(outgoingParticipant, 236)).toBe(true);
    incomingParticipant.onStart(incomingParticipant, 0, 250, null);

    expect(completedGeneration.value).toBe(0);
    expect(incoming.onStart).toHaveBeenCalledWith(incoming, 0, 220, null);
  });

  it("does not allow an older participant to overwrite a newer clock", () => {
    const startedGeneration = shared(4);
    const startedAt = shared(80);

    publishTrayTransitionStart(startedGeneration, startedAt, 3, 120);

    expect(startedGeneration.value).toBe(4);
    expect(startedAt.value).toBe(80);
  });

  it("retires the clock after a no-layout content transition", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const content = createAnimation();
    const laterLayout = createAnimation();
    const contentParticipant = withTrayTransitionStart(
      content as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      9,
      "incoming",
    ) as unknown as AnimationObject<number>;

    contentParticipant.onStart(contentParticipant, 0, 300, null);
    expect(contentParticipant.onFrame(contentParticipant, 316)).toBe(true);
    expect(completedGeneration.value).toBe(9);

    const laterLayoutParticipant = withTrayTransitionStart(
      laterLayout as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      9,
      "layout",
    ) as unknown as AnimationObject<number>;

    laterLayoutParticipant.onStart(laterLayoutParticipant, 0, 500, null);

    expect(laterLayout.onStart).toHaveBeenCalledWith(
      laterLayout,
      0,
      500,
      null,
    );
  });
});
