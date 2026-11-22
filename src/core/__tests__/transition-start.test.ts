// every transition participant joins the same UI clock
import { describe, expect, it, jest } from "@jest/globals";
import type {
  AnimatableValue,
  AnimationObject,
  SharedValue,
} from "react-native-reanimated";
import {
  openTrayKeyboardGate,
  publishTrayTransitionStart,
  TRAY_KEYBOARD_GATE_MAX_WAIT_MS,
  resolveTrayTransitionFullScreenChanged,
  resolveTrayTransitionGeneration,
  shouldWaitForTrayLayoutStart,
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
  // the Worklets mock, the real module needs its native part
  const Worklets = jest.requireActual(
    "react-native-worklets/lib/module/mock",
  ) as Record<string, unknown>;

  return {
    ...Worklets,
    scheduleOnRN: (
      callback: (...args: never[]) => unknown,
      ...args: never[]
    ) => callback(...args),
  };
});

// the shared value shape worklet tests use
const shared = (value: number) => ({ value }) as SharedValue<number>;

// a controllable animation stub for clock assertions
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
  it("keeps keyboard content on the shell layout clock", () => {
    const transitionStart = {
      generation: 4,
      fullScreenChanged: false,
      layoutStartRequired: true,
      generationValue: shared(4),
      fullScreenChangedValue: shared(0),
      startedAt: shared(0),
      startedGeneration: shared(0),
      layoutStartedGeneration: shared(0),
      completedGeneration: shared(0),
      keyboardStepTransition: true,
    };

    expect(shouldWaitForTrayLayoutStart(transitionStart, 4)).toBe(true);
    expect(
      shouldWaitForTrayLayoutStart(
        { ...transitionStart, keyboardStepTransition: false },
        4,
      ),
    ).toBe(true);
    expect(
      shouldWaitForTrayLayoutStart(
        { ...transitionStart, layoutStartRequired: false },
        4,
      ),
    ).toBe(false);
    expect(shouldWaitForTrayLayoutStart(null, 4)).toBe(false);
  });

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

  it("does not let sheet content publish the clock before layout starts", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const outgoing = createAnimation();
    const content = createAnimation();
    const layout = createAnimation();
    const outgoingParticipant = withTrayTransitionStart(
      outgoing as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      18,
      "outgoing",
      undefined,
      false,
      true,
    ) as unknown as AnimationObject<number>;
    const contentParticipant = withTrayTransitionStart(
      content as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      18,
      "incoming",
      undefined,
      false,
      true,
    ) as unknown as AnimationObject<number>;
    const layoutParticipant = withTrayTransitionStart(
      layout as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      18,
      "layout",
    ) as unknown as AnimationObject<number>;

    outgoingParticipant.onStart(outgoingParticipant, 0, 100, null);
    contentParticipant.onStart(contentParticipant, 0, 100, null);

    expect(outgoing.onStart).not.toHaveBeenCalled();
    expect(content.onStart).not.toHaveBeenCalled();
    expect(startedGeneration.value).toBe(0);
    expect(layoutStartedGeneration.value).toBe(0);
    expect(outgoingParticipant.onFrame(outgoingParticipant, 116)).toBe(false);
    expect(contentParticipant.onFrame(contentParticipant, 116)).toBe(false);

    layoutParticipant.onStart(layoutParticipant, 0, 120, null);

    expect(layoutStartedGeneration.value).toBe(18);
    expect(startedGeneration.value).toBe(18);
    expect(outgoingParticipant.onFrame(outgoingParticipant, 120)).toBe(true);
    expect(contentParticipant.onFrame(contentParticipant, 120)).toBe(true);
    expect(outgoing.onStart).toHaveBeenCalledWith(outgoing, 0, 120, null);
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
      layoutStartRequired: true,
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

  it("does not let a stale shared generation mask a newer transition descriptor", () => {
    const transitionStart = {
      generation: 15,
      fullScreenChanged: true,
      layoutStartRequired: true,
      generationValue: shared(9),
      fullScreenChangedValue: shared(0),
      startedAt: shared(0),
      startedGeneration: shared(9),
      layoutStartedGeneration: shared(9),
      completedGeneration: shared(9),
    };

    expect(resolveTrayTransitionGeneration(transitionStart)).toBe(15);
    expect(resolveTrayTransitionFullScreenChanged(transitionStart)).toBe(
      true,
    );
  });

  describe("keyboard gate", () => {
    const setup = () => {
      const clock = {
        startedGeneration: shared(0),
        startedAt: shared(0),
        layoutStartedGeneration: shared(0),
        completedGeneration: shared(0),
      };
      const gate = {
        armedGeneration: shared(9),
        startedGeneration: shared(0),
        armedTarget: shared(1),
        keyboardProgress: shared(0),
      };
      const layoutInner = createAnimation();
      const contentInner = createAnimation();
      const layout = withTrayTransitionStart(
        layoutInner as unknown as number,
        clock.startedGeneration,
        clock.startedAt,
        clock.layoutStartedGeneration,
        clock.completedGeneration,
        9,
        "layout",
        undefined,
        false,
        false,
        gate,
      ) as unknown as AnimationObject<number>;
      const content = withTrayTransitionStart(
        contentInner as unknown as number,
        clock.startedGeneration,
        clock.startedAt,
        clock.layoutStartedGeneration,
        clock.completedGeneration,
        9,
        "incoming",
        undefined,
        false,
        true,
      ) as unknown as AnimationObject<number>;

      return { clock, gate, layout, layoutInner, content, contentInner };
    };

    it("holds the layout, the clock and the content until the keyboard starts", () => {
      const { clock, gate, layout, layoutInner, content, contentInner } =
        setup();

      layout.onStart(layout, 0, 100, null);
      content.onStart(content, 0, 100, null);
      layout.onFrame(layout, 116);
      content.onFrame(content, 116);

      expect(layoutInner.onStart).not.toHaveBeenCalled();
      expect(contentInner.onStart).not.toHaveBeenCalled();
      expect(clock.layoutStartedGeneration.value).toBe(0);
      expect(clock.startedGeneration.value).toBe(0);

      // the keyboard starts moving on the UI thread
      openTrayKeyboardGate(gate);
      layout.onFrame(layout, 133);
      content.onFrame(content, 133);

      expect(clock.layoutStartedGeneration.value).toBe(9);
      expect(clock.startedGeneration.value).toBe(9);
      expect(clock.startedAt.value).toBe(133);
      expect(layoutInner.onStart).toHaveBeenCalledWith(
        layoutInner,
        0,
        133,
        null,
      );
      expect(contentInner.onStart).toHaveBeenCalledWith(
        contentInner,
        0,
        133,
        null,
      );
    });

    it("releases the layout when the keyboard never starts", () => {
      const { clock, layout, layoutInner } = setup();

      layout.onStart(layout, 0, 100, null);
      layout.onFrame(layout, 100 + TRAY_KEYBOARD_GATE_MAX_WAIT_MS - 1);
      expect(layoutInner.onStart).not.toHaveBeenCalled();

      layout.onFrame(layout, 100 + TRAY_KEYBOARD_GATE_MAX_WAIT_MS);
      expect(layoutInner.onStart).toHaveBeenCalled();
      expect(clock.layoutStartedGeneration.value).toBe(9);
    });

    it("opens when the keyboard is already moving, even if its start signal came first", () => {
      const { gate, layout, layoutInner } = setup();

      layout.onStart(layout, 0, 100, null);
      expect(layoutInner.onStart).not.toHaveBeenCalled();

      gate.keyboardProgress.value = 0.08;
      layout.onFrame(layout, 116);
      expect(layoutInner.onStart).toHaveBeenCalled();
    });

    it("waits for a keyboard going away to leave its shown position", () => {
      const { gate, layout, layoutInner } = setup();

      gate.armedTarget.value = 0;
      gate.keyboardProgress.value = 1;
      layout.onStart(layout, 0, 100, null);
      expect(layoutInner.onStart).not.toHaveBeenCalled();

      gate.keyboardProgress.value = 0.95;
      layout.onFrame(layout, 116);
      expect(layoutInner.onStart).toHaveBeenCalled();
    });

    it("does not hold a transition the gate was not armed for", () => {
      const { clock, gate, layout, layoutInner } = setup();

      gate.armedGeneration.value = 8;
      layout.onStart(layout, 0, 100, null);

      expect(layoutInner.onStart).toHaveBeenCalled();
      expect(clock.startedAt.value).toBe(100);
    });
  });

  it("holds the layout clock for the requested frames before starting", () => {
    const startedGeneration = shared(0);
    const startedAt = shared(0);
    const layoutStartedGeneration = shared(0);
    const completedGeneration = shared(0);
    const inner = createAnimation();
    const layout = withTrayTransitionStart(
      inner as unknown as number,
      startedGeneration,
      startedAt,
      layoutStartedGeneration,
      completedGeneration,
      5,
      "layout",
      undefined,
      false,
      false,
      undefined,
      2,
    ) as unknown as AnimationObject<number>;

    layout.onStart(layout, 0, 100, null);
    layout.onFrame(layout, 116);
    expect(inner.onStart).not.toHaveBeenCalled();
    expect(layoutStartedGeneration.value).toBe(0);

    layout.onFrame(layout, 133);
    expect(inner.onStart).toHaveBeenCalledWith(inner, 0, 133, null);
    expect(layoutStartedGeneration.value).toBe(5);
    expect(startedAt.value).toBe(133);
  });
});
