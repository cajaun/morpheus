# ActionTray Exploratory Charters

## AT-EXP-001 — Transition interruption

- Time box: 45 minutes
- Mission: discover incoherent states caused by interrupting tray transitions.
- Vary: forward/back, close, rapid taps, fullscreen boundaries, pages, nested
  trays, app backgrounding, and keyboard appearance.
- Oracles: no disappearance, duplication, stale interaction surface, wrong
  destination, unsafe close, or unrecoverable state.
- Capture: exact sequence, video, final state, transition logs, frequency.

## AT-EXP-002 — Geometry and content stress

- Time box: 45 minutes
- Mission: expose reflow, clipping, incorrect measurement ownership, and unsafe
  area failures.
- Vary: shortest/longest content, text size, device size, orientation where
  supported, footer presence, safe area, theme, and heavy media.
- Oracles: intended alignment remains stable; essential content and controls stay
  accessible; revisiting a step restores its own geometry.

## AT-EXP-003 — Keyboard and focus race

- Time box: 45 minutes
- Mission: find race conditions between focus, native keyboard events, layout,
  content release, and close.
- Vary: autofocus, manual focus, immediate close, next/back while keyboard moves,
  nested help tray, hardware keyboard, and repeated entry.
- Oracles: tray and content remain visible, motion is coherent, input stays
  usable, and focus returns to a predictable owner.

## Session notes

Use the exploratory template. Separate observations from confirmed defects.
Debrief by adding new fault hypotheses to tests, checklists, or the risk register.
