# Action tray transition contract

The runtime creates one transition contract before presentation work begins.
Its `generation` is the immutable transaction identity used by navigation,
snapshots, measurement, shell layout, incoming and outgoing content, page
springs, close retention, completion, and interruption.

The descriptor is provisional while the transition is `requested`, because
React registration can finish after navigation has created the transition.
The descriptor may be refined during that phase. Preparation seals the
descriptor; after that point a changed destination must interrupt the old
generation and create a new one instead of mutating an already-consumed
contract.

The host state retains this descriptor as `lastTransition` for presenter
retention and render continuity. It is not the authoritative answer to
whether a transition is currently active; use the lifecycle's `getActive()`
for that question.

## Lifecycle

The lifecycle milestones are ordered as:

`requested -> prepared -> committed -> layoutStarted -> completed`

The forward milestones are optional observability points, so an implementation
may advance from `requested` directly to `committed` or `completed`. It may
never move backwards, and `completed`, `interrupted`, and `cancelled` are
terminal states.

A newer generation interrupts the current generation. A retained close host
keeps the closing contract until its own animation completes. Late callbacks
cannot revive an interrupted, cancelled, or completed transaction, and phase
updates cannot move a transaction backwards.

## Geometry and measurement ownership

Geometry is captured as source and target snapshots on the lifecycle record.
Every snapshot is owned by root tray, step, page, presentation mode, and
transition generation. Header, body, footer, safe-area, and shell measurements
are accumulated without changing layout or animation values.

The height cache keeps its established semantic tray key so returning steps
preserve their current visual behavior. It now also records the measurement
owner that produced each value; this permits later invalidation policy without
changing today’s restore policy.

## Shared regions and participants

Each contract declares surface, header, body, and footer continuity. The
contract describes whether a region is persistent, keyed overlap, replacement,
or absent. The lifecycle record distinguishes planned participants from
observed participant events. Planned participants come from the contract.
Observed events are optional telemetry and are not a second source of truth
for transition ownership or completion. Reanimated entering and exiting
builders remain contract-agnostic.

## Behavioral compatibility

Contracts are observational and coordinative. They do not choose durations,
easings, transforms, transform origins, mount windows, footer sizing, safe-area
spacing, keyboard movement, or the presenter’s established adjacent-fullscreen
compatibility rule. Those remain in their existing owners.
