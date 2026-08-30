import type {
  TrayTransitionContract,
  TrayMeasurementOwner,
  TrayTransitionLifecycle,
  TrayTransitionLifecycleEvent,
  TrayTransitionLifecycleRecord,
  TrayTransitionPhase,
} from "./types";
import type { TrayTransitionParticipant } from "./types";

const terminalPhases = new Set<TrayTransitionPhase>([
  "completed",
  "interrupted",
  "cancelled",
]);

// check whether a lifecycle phase can accept more transition work
export const isTrayTransitionTerminal = (phase: TrayTransitionPhase) =>
  terminalPhases.has(phase);

// read one clock source for lifecycle event timestamps
const now = () => performance.now();
const MAX_TRANSITION_HISTORY = 100;
const phaseOrder: Partial<Record<TrayTransitionPhase, number>> = {
  requested: 0,
  prepared: 1,
  committed: 2,
  layoutStarted: 3,
  completed: 4,
};

// check whether a phase has consumed the provisional contract
const isAtOrAfterPreparation = (phase: TrayTransitionPhase) => {
  const order = phaseOrder[phase];
  return order !== undefined && order >= phaseOrder.prepared!;
};

// verify that measured geometry belongs to the declared endpoint
const endpointMatchesOwner = (
  endpoint: TrayTransitionContract["from"],
  owner: TrayMeasurementOwner,
) => {
  if (!endpoint) {
    return false;
  }

  return (
    owner.trayId === endpoint.trayId &&
    owner.stepIndex === endpoint.stepIndex &&
    owner.stepKey === endpoint.stepKey &&
    owner.pageIndex === endpoint.pageIndex &&
    owner.mode === endpoint.mode
  );
};

// derive planned participants from shared region behavior
const resolveContractParticipants = (
  contract: TrayTransitionContract,
): TrayTransitionParticipant[] =>
  contract.sharedRegions.flatMap((region) => {
    const coordinateSpace =
      region.region === "surface" ? "traySurface" : region.region;

    if (
      region.behavior === "persistent" &&
      contract.to !== null &&
      region.targetId
    ) {
      return [
        {
          id: region.targetId,
          role: "shared" as const,
          region: region.region,
          coordinateSpace,
          endpoint: contract.to,
        },
      ];
    }

    const participants: TrayTransitionParticipant[] = [];

    if (contract.from !== null && region.sourceId) {
      participants.push({
        id: `${region.sourceId}:outgoing`,
        role: "outgoing",
        region: region.region,
        coordinateSpace,
        endpoint: contract.from,
      });
    }

    if (contract.to !== null && region.targetId) {
      participants.push({
        id: `${region.targetId}:incoming`,
        role: "incoming",
        region: region.region,
        coordinateSpace,
        endpoint: contract.to,
      });
    }

    return participants;
  });

// create the lifecycle ledger that owns generation and phase transitions
export const createTrayTransitionLifecycle = (): TrayTransitionLifecycle => {
  const records = new Map<number, TrayTransitionLifecycleRecord>();
  let activeGeneration: number | null = null;

  const append = (
    record: TrayTransitionLifecycleRecord,
    event: TrayTransitionLifecycleEvent,
  ): TrayTransitionLifecycleRecord => {
    const next = {
      ...record,
      phase: event.phase,
      contractState:
        record.contractState === "sealed" ||
        !isAtOrAfterPreparation(event.phase)
          ? record.contractState
          : "sealed",
      events: [...record.events, event],
    };

    records.set(record.contract.generation, next);

    if (terminalPhases.has(event.phase) && activeGeneration === record.contract.generation) {
      activeGeneration = null;
    }

    return next;
  };

  const mark: TrayTransitionLifecycle["mark"] = (
    generation,
    phase,
    details,
    at = now(),
  ) => {
    const record = records.get(generation);

    if (!record || terminalPhases.has(record.phase)) {
      return false;
    }

    if (record.phase === phase) {
      // native and react callbacks can repeat phase publication is idempotent
      return true;
    }

    const currentOrder = phaseOrder[record.phase];
    const nextOrder = phaseOrder[phase];

    if (
      currentOrder !== undefined &&
      nextOrder !== undefined &&
      nextOrder < currentOrder
    ) {
      // late react and native callbacks cannot move a transaction backwards
      return false;
    }

    append(record, { phase, at, details });
    return true;
  };

  return {
    begin: (contract, at = now()) => {
      if (records.has(contract.generation)) {
        return;
      }

      if (activeGeneration !== null) {
        mark(
          activeGeneration,
          "interrupted",
          { supersededByGeneration: contract.generation },
          at,
        );
      }

      if (records.size >= MAX_TRANSITION_HISTORY) {
        const oldestTerminalGeneration = [...records.entries()].find(
          ([generation, record]) =>
            generation !== activeGeneration && terminalPhases.has(record.phase),
        )?.[0];

        if (oldestTerminalGeneration !== undefined) {
          records.delete(oldestTerminalGeneration);
        }
      }

      const requested: TrayTransitionLifecycleEvent = {
        phase: "requested",
        at,
      };

      records.set(contract.generation, {
        contract,
        contractState: "provisional",
        phase: "requested",
        events: [requested],
        geometry: {},
        participants: resolveContractParticipants(contract),
        participantEvents: [],
      });
      activeGeneration = contract.generation;
    },
    refineContract: (contract) => {
      const record = records.get(contract.generation);

      if (
        !record ||
        terminalPhases.has(record.phase) ||
        record.contractState === "sealed"
      ) {
        return false;
      }

      records.set(contract.generation, {
        ...record,
        contract,
        participants: resolveContractParticipants(contract),
      });
      return true;
    },
    mark,
    captureGeometry: (generation, role, snapshot) => {
      const record = records.get(generation);

      if (!record || terminalPhases.has(record.phase)) {
        return false;
      }

      const endpoint = role === "source"
        ? record.contract.from
        : record.contract.to;

      if (
        snapshot.owner.generation !== generation ||
        !endpointMatchesOwner(endpoint, snapshot.owner)
      ) {
        return false;
      }

      records.set(generation, {
        ...record,
        geometry: {
          ...record.geometry,
          [role]: snapshot,
        },
      });
      return true;
    },
    registerParticipants: (generation, participants) => {
      const record = records.get(generation);

      if (!record || terminalPhases.has(record.phase)) {
        return false;
      }

      const byId = new Map(
        [...record.participants, ...participants].map((participant) => [
          participant.id,
          participant,
        ]),
      );

      records.set(generation, {
        ...record,
        participants: [...byId.values()],
      });
      return true;
    },
    markParticipant: (generation, event, at = now()) => {
      const record = records.get(generation);

      if (
        !record ||
        terminalPhases.has(record.phase)
      ) {
        return false;
      }

      const nextEvent = { ...event, at };
      const alreadyRecorded = record.participantEvents.some(
        (candidate) =>
          candidate.participantId === nextEvent.participantId &&
          candidate.role === nextEvent.role &&
          candidate.phase === nextEvent.phase,
      );

      if (alreadyRecorded) {
        return true;
      }

      records.set(generation, {
        ...record,
        participantEvents: [...record.participantEvents, nextEvent],
      });
      return true;
    },
    get: (generation) => records.get(generation) ?? null,
    getActive: () =>
      activeGeneration === null ? null : records.get(activeGeneration) ?? null,
    getHistory: () => [...records.values()],
  };
};
