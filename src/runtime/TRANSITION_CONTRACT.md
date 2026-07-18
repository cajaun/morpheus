# Action tray transition contract

The runtime creates one immutable transition contract before presentation work
begins. Its `generation` is the transaction identity used by navigation,
snapshots, measurement, shell layout, incoming and outgoing content, page
springs, close retention, completion, and interruption.

## Lifecycle

The canonical lifecycle is:

`requested -> prepared -> committed -> layoutStarted -> completed`

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
or absent. The lifecycle can record participant events, but it is deliberately
not connected from inside `TrayStepContent`: Reanimated entering and exiting
builders remain completely contract-agnostic.

## Behavioral compatibility

Contracts are observational and coordinative. They do not choose durations,
easings, transforms, transform origins, mount windows, footer sizing, safe-area
spacing, keyboard movement, or the presenter’s established adjacent-fullscreen
compatibility rule. Those remain in their existing owners.
