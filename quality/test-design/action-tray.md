# ActionTray Test Design

## Test object

ActionTray includes registration, stack ownership, root/nested presentation,
step and page navigation, rendering snapshots, measurement/cache ownership,
layout/visibility animation policy, keyboard coordination, gestures, headers,
footers, and fullscreen behavior.

## State model

Primary states:

1. Closed
2. Sheet open
3. Sheet step transition
4. Fullscreen open
5. Fullscreen page transition
6. Fullscreen-to-sheet transition
7. Keyboard-aware sheet
8. Nested tray open over parent
9. Closing

Primary events:

- open, open nested, next, back, set page, request close, dismiss, keyboard
  start/end, gesture close, content measurement, transition completion.

Minimum automated criterion is all valid runtime transitions plus representative
invalid/no-op transitions. Native-only events are covered through the checklist
and exploratory charters until a device harness exists.

## Decision tables

### Presentation boundary

| Rule | Source | Destination | Expected boundary | Automated ID |
| --- | --- | --- | --- | --- |
| 1 | none | sheet/fullscreen | opening | AT-DT-001 |
| 2 | sheet/fullscreen | none | closing | AT-DT-002 |
| 3 | sheet | sheet | sheetToSheet | AT-DT-003 |
| 4 | sheet | fullscreen | sheetToFullScreen | AT-DT-004 |
| 5 | fullscreen | sheet | fullScreenToSheet | AT-DT-005 |
| 6 | fullscreen | fullscreen | fullScreenToFullScreen | AT-DT-006 |

### Request-close policy

| Fullscreen | Behavior | Step > 0 | Expected action |
| --- | --- | --- | --- |
| no | any | any | dismiss |
| yes | dismiss | any | dismiss |
| yes | returnToShell | no | dismiss |
| yes | returnToShell | yes | previous shell step |

## Equivalence partitions

- Presentation mode: sheet, fullscreen.
- Navigation reason: forward, backward, neutral/open-close.
- Page ownership: no pages, matching active step, stale different step.
- Background scale: disabled, enabled default, enabled valid override, invalid.
- Footer: absent, shell footer, page-local footer.
- Keyboard: idle, entering, visible, dismissing, interrupted.
- Host: root, nested, closing, replacement pending.

## Boundaries

- Step/page index: below zero, zero, interior, last, above last, empty.
- Background scale: negative, zero, finite positive, non-finite.
- Measured height: zero, one-pixel transient, valid height, stale prior height.
- Host pool: zero, one, two, attempted third assignment.
- Timing: before layout start, exact release generation, after completion,
  interrupted by a newer generation.

## Regression catalogue

| ID | Historical failure | Required evidence |
| --- | --- | --- |
| AT-REG-001 | Fullscreen page D exit lost its actual source | Contract retains page and direction |
| AT-REG-002 | Incoming content received a visual head start | Layout/content start generation ordering |
| AT-REG-003 | Returning sheet restored another step's height | Cache ownership and revisit sequence |
| AT-REG-004 | Keyboard-aware transition made tray disappear | Native keyboard event and visibility sequence |
| AT-REG-005 | Footer changed width during fullscreen morph | Visual geometry checklist |
| AT-REG-006 | Header/body reflowed or shifted between modes | Canonical grid and frame review |

## Traceability rule

Automated test names contain their test ID. Manual evidence references the same
ID. When a defect creates a new regression condition, add it to this catalogue,
the appropriate automated suite or checklist, and the risk register if needed.
