# Morpheus Quality Engineering

This directory is the operating layer for testing Morpheus. Automated tests are
only one part of the layer. The full system combines risk analysis, systematic
test design, structural coverage, exploratory testing, defect classification,
and release evidence.

## Quality commands

| Command | Purpose |
| --- | --- |
| `npm test` | Local watch mode while developing |
| `npm run test:ci` | Deterministic non-watch execution |
| `npm run test:action-tray` | Fast ActionTray subsystem suite |
| `npm run test:coverage` | Suite plus coverage ratchet |
| `npm run typecheck` | Strict TypeScript verification |
| `npm run quality` | Lint, type check, tests, and coverage gate |

## Required workflow for a change

1. Identify the user behavior and acceptance criteria.
2. Determine product risk using likelihood and impact.
3. Select test techniques appropriate to the behavior.
4. Add or update automated tests at the lowest effective level.
5. Add regression coverage for every confirmed defect.
6. Execute the relevant exploratory checklist when visual, timing, native, or
   accessibility behavior cannot be proven by Jest.
7. Record defects using the shared severity and evidence format.
8. Attach test results and residual risks to the change.

## Directory map

- `test-strategy.md`: governing principles, levels, gates, and ownership.
- `risk-register.md`: current product risks and required test intensity.
- `defect-management.md`: severity spectrum, reporting, and metrics.
- `test-design/action-tray.md`: traceable ActionTray models and coverage items.
- `checklists/action-tray.md`: repeatable manual/non-functional verification.
- `charters/action-tray.md`: focused exploratory sessions.
- `templates/`: reusable test case, charter, and defect formats.

## Test ID convention

`<area>-<technique>-<number>`

- Area examples: `AT` ActionTray, `NAV` navigation, `A11Y` accessibility.
- Technique examples: `EP`, `BVA`, `DT`, `ST`, `REG`, `PERF`, `EXP`.
- Example: `AT-DT-004` is ActionTray decision-table rule 4.

IDs connect acceptance criteria, test design, automated tests, exploratory
evidence, and defects without coupling tests to implementation filenames.
