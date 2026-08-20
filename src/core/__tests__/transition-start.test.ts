import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimatableValue,
  AnimationObject,
  SharedValue,
} from "react-native-reanimated";
import {
  publishTrayTransitionStart,
  resolveTrayTransitionFullScreenChanged,
  resolveTrayTransitionGeneration,
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

  it("waits for the shell clock when a boundary content participant is gated", () => {
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
      12,
      "incoming",
      undefined,
      true,
    ) as unknown as AnimationObject<number>;

    participant.onStart(participant, 0, 100, null);
    expect(content.onStart).not.toHaveBeenCalled();
    expect(participant.onFrame(participant, 116)).toBe(false);

    startedAt.value = 120;
    startedGeneration.value = 12;
    expect(participant.onFrame(participant, 120)).toBe(true);
    expect(content.onStart).toHaveBeenCalledWith(content, 0, 120, null);
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

  it("lets the fullscreen shell join the content clock", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const content = createAnimation();
    const layout = createAnimation();

    const contentParticipant = withTrayTransitionStart(
      content as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      11,
      "incoming",
    ) as unknown as AnimationObject<number>;
    const layoutParticipant = withTrayTransitionStart(
      layout as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      11,
      "layout",
    ) as unknown as AnimationObject<number>;

    contentParticipant.onStart(contentParticipant, 0, 105, null);
    expect(startedGeneration.value).toBe(11);
    expect(startedAt.value).toBe(105);
    expect(content.onStart).toHaveBeenCalledWith(content, 0, 105, null);

    layoutParticipant.onStart(layoutParticipant, 0, 110, null);
    expect(layoutStartedGeneration.value).toBe(11);
    expect(layout.onStart).toHaveBeenCalledWith(layout, 0, 105, null);

    expect(layoutParticipant.onFrame(layoutParticipant, 120)).toBe(true);
    expect(completedGeneration.value).toBe(11);
  });

  it("reads the current descriptor for retained outgoing content", () => {
    const transitionStart = {
      generation: 4,
      fullScreenChanged: false,
      generationValue: shared(5),
      fullScreenChangedValue: shared(1),
      startedAt: shared(0),
      startedGeneration: shared(0),
      layoutStartedGeneration: shared(0),
      completedGeneration: shared(0),
    };

    expect(resolveTrayTransitionGeneration(transitionStart)).toBe(5);
    expect(resolveTrayTransitionFullScreenChanged(transitionStart)).toBe(
      true,
    );
  });
});
