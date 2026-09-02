# ActionTray Exploratory Charters

## AT-EXP-001 — Transition interruption

- Time box: 45 minutes
- Mission: discover incoherent states caused by interrupting tray transitions.
- Vary: forward/back, close, rapid taps, fullscreen boundaries, pages, nested
  trays, and app backgrounding.
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

## Session notes

Use the exploratory template. Separate observations from confirmed defects.
Debrief by adding new fault hypotheses to tests, checklists, or the risk register.
