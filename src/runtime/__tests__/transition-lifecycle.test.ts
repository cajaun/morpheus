// lifecycle phases and geometry ownership follow one generation
import { describe, expect, it } from "@jest/globals";
import { createTrayTransitionContract } from "../transition-contract";
import { createTrayTransitionLifecycle } from "../transition-lifecycle";
import { createTrayMeasurementOwner } from "../types";

// a contract whose endpoint identity follows the generation
const contract = (generation: number) =>
  createTrayTransitionContract({
    generation,
    reason: "nextStep",
    from: {
      trayId: "root",
      stepIndex: generation - 1,
      stepKey: `step-${generation - 1}`,
      mode: "sheet",
    },
    to: {
      trayId: "root",
      stepIndex: generation,
      stepKey: `step-${generation}`,
      mode: generation % 2 === 0 ? "fullScreen" : "sheet",
    },
  });

describe("tray transition lifecycle", () => {
  it("AT-LIFECYCLE-ST-001 records the complete transition sequence", () => {
    const lifecycle = createTrayTransitionLifecycle();

    lifecycle.begin(contract(1), 10);
    lifecycle.mark(1, "prepared", undefined, 20);
    lifecycle.mark(1, "committed", undefined, 30);
    lifecycle.mark(1, "layoutStarted", undefined, 40);
    lifecycle.mark(1, "completed", undefined, 50);

    expect(lifecycle.get(1)).toMatchObject({
      phase: "completed",
      events: [
        { phase: "requested", at: 10 },
        { phase: "prepared", at: 20 },
        { phase: "committed", at: 30 },
        { phase: "layoutStarted", at: 40 },
        { phase: "completed", at: 50 },
      ],
    });
    expect(lifecycle.getActive()).toBeNull();
  });

  it("AT-LIFECYCLE-ST-002 interrupts the active generation before starting another", () => {
    const lifecycle = createTrayTransitionLifecycle();

    lifecycle.begin(contract(1), 10);
    lifecycle.mark(1, "prepared", undefined, 20);
    lifecycle.begin(contract(2), 25);

    expect(lifecycle.get(1)).toMatchObject({
      phase: "interrupted",
      events: [
        { phase: "requested" },
        { phase: "prepared" },
        {
          phase: "interrupted",
          details: { supersededByGeneration: 2 },
        },
      ],
    });
    expect(lifecycle.getActive()?.contract.generation).toBe(2);
  });

  it("AT-LIFECYCLE-ST-003 ignores stale and terminal callbacks", () => {
    const lifecycle = createTrayTransitionLifecycle();

    expect(lifecycle.mark(99, "prepared", undefined, 10)).toBe(false);

    lifecycle.begin(contract(1), 20);
    expect(lifecycle.mark(1, "completed", undefined, 30)).toBe(true);
    expect(lifecycle.mark(1, "layoutStarted", undefined, 40)).toBe(false);
    expect(
      lifecycle.markParticipant(1, {
        participantId: "late",
        role: "incoming",
        phase: "mounted",
      }),
    ).toBe(false);
    expect(lifecycle.get(1)?.phase).toBe("completed");
  });

  it("AT-LIFECYCLE-ST-003A permits forward milestone skips but rejects backwards edges", () => {
    const lifecycle = createTrayTransitionLifecycle();

    lifecycle.begin(contract(1), 10);

    expect(lifecycle.mark(1, "layoutStarted", undefined, 20)).toBe(true);
    expect(lifecycle.mark(1, "prepared", undefined, 30)).toBe(false);
    expect(lifecycle.mark(1, "completed", undefined, 40)).toBe(true);
  });

  it("AT-LIFECYCLE-ST-004 treats repeated phase callbacks as idempotent", () => {
    const lifecycle = createTrayTransitionLifecycle();

    lifecycle.begin(contract(1), 10);
    expect(lifecycle.mark(1, "prepared", undefined, 20)).toBe(true);
    expect(lifecycle.mark(1, "prepared", undefined, 21)).toBe(true);
    expect(lifecycle.get(1)?.events).toHaveLength(2);
  });

  it("AT-LIFECYCLE-ST-005A refines provisional descriptors and seals them at preparation", () => {
    const lifecycle = createTrayTransitionLifecycle();
    const initial = contract(1);
    const refined = {
      ...initial,
      to: {
        ...initial.to!,
        stepKey: "registered-step",
      },
    };

    lifecycle.begin(initial, 10);

    expect(lifecycle.refineContract?.(refined)).toBe(true);
    expect(lifecycle.get(1)?.contract.to?.stepKey).toBe("registered-step");
    expect(lifecycle.get(1)?.contractState).toBe("provisional");

    lifecycle.mark(1, "prepared", undefined, 20);

    expect(lifecycle.get(1)?.contractState).toBe("sealed");
    expect(lifecycle.refineContract?.(initial)).toBe(false);
    expect(lifecycle.get(1)?.contract.to?.stepKey).toBe("registered-step");
  });

  it("AT-LIFECYCLE-ST-006 owns source and target geometry atomically", () => {
    const lifecycle = createTrayTransitionLifecycle();
    const transition = contract(2);
    const sourceOwner = createTrayMeasurementOwner({
      rootTrayId: "root",
      endpoint: transition.from!,
      generation: transition.generation,
    });
    const targetOwner = createTrayMeasurementOwner({
      rootTrayId: "root",
      endpoint: transition.to!,
      generation: transition.generation,
    });

    lifecycle.begin(transition, 10);
    lifecycle.captureGeometry(2, "source", {
      owner: sourceOwner,
      capturedAt: 11,
      shellFrame: { x: 12, y: 300, width: 368, height: 500 },
    });
    lifecycle.captureGeometry(2, "target", {
      owner: targetOwner,
      capturedAt: 12,
      shellFrame: { x: 0, y: 0, width: 390, height: 844 },
    });

    expect(lifecycle.get(2)?.geometry).toMatchObject({
      source: { owner: { mode: "sheet", generation: 2 } },
      target: { owner: { mode: "fullScreen", generation: 2 } },
    });
  });

  it("AT-LIFECYCLE-ST-007 rejects geometry from another generation or endpoint", () => {
    const lifecycle = createTrayTransitionLifecycle();
    const transition = contract(2);
    const wrongOwner = createTrayMeasurementOwner({
      rootTrayId: "root",
      endpoint: transition.from!,
      generation: 1,
    });

    lifecycle.begin(transition, 10);

    expect(
      lifecycle.captureGeometry(2, "source", {
        owner: wrongOwner,
        capturedAt: 11,
        shellFrame: { x: 0, y: 0, width: 1, height: 1 },
      }),
    ).toBe(false);
    expect(lifecycle.get(2)?.geometry).toEqual({});
  });

  it("AT-LIFECYCLE-ST-008 records actual incoming and outgoing participants", () => {
    const lifecycle = createTrayTransitionLifecycle();

    lifecycle.begin(contract(2), 10);
    lifecycle.markParticipant(2, {
      participantId: "root-step-2",
      role: "incoming",
      phase: "mounted",
    }, 11);
    lifecycle.markParticipant(2, {
      participantId: "root-step-1",
      role: "outgoing",
      phase: "animationCompleted",
    }, 20);

    expect(lifecycle.get(2)?.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "incoming", region: "body" }),
        expect.objectContaining({ role: "outgoing", region: "body" }),
      ]),
    );
    expect(lifecycle.get(2)?.participantEvents).toEqual([
      expect.objectContaining({ role: "incoming", phase: "mounted" }),
      expect.objectContaining({
        role: "outgoing",
        phase: "animationCompleted",
      }),
    ]);
  });
});
