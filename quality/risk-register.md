# Product Risk Register

Scores use likelihood × impact on a 1–5 scale. Review after material design
changes and defect analysis.

| ID | Risk | L | I | Score | Required controls |
| --- | --- | ---: | ---: | ---: | --- |
| AT-R01 | Incoming content starts before shell geometry | 4 | 4 | 16 | UI-clock contract tests, transition telemetry, frame-by-frame charter |
| AT-R02 | Fullscreen exit uses the wrong source step/page | 4 | 4 | 16 | Page-aware transition state tests and forward/backward regressions |
| AT-R03 | Keyboard event and tray morph diverge | 4 | 4 | 16 | Event-order tests, physical-device keyboard matrix, interruption charter |
| AT-R04 | Cached measurement belongs to another step | 3 | 4 | 12 | Ownership tests, revisit sequence tests, invalidation checks |
| AT-R05 | Close/dismiss leaves stale or invisible host | 3 | 5 | 15 | All-transition stack tests and repeated open/close soak |
| AT-R06 | Header/body/footer grid shifts across modes | 4 | 3 | 12 | Geometry decision table and visual checklist |
| AT-R07 | Nested tray corrupts parent state/focus | 3 | 4 | 12 | Nested state sequences, focus recovery, repeated nesting |
| AT-R08 | Heavy incoming content causes frame drops | 3 | 3 | 9 | Performance budget, representative heavy fixture, release profiling |
| AT-R09 | Accessibility focus/labels fail in modal state | 3 | 4 | 12 | VoiceOver/TalkBack checklist and semantic component tests |
| AT-R10 | Instrumentation changes production behavior | 2 | 4 | 8 | Disabled-instrumentation tests and production configuration review |

Residual risks must be recorded in change/release evidence. A passing automated
suite does not close risks that require native visual, accessibility, or
performance observation.
