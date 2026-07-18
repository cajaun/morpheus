# Morpheus Test Strategy

## 1. Purpose

The goal is evidence-based confidence that Morpheus behaves correctly, remains
usable, and does not regress as its native animation and interaction systems
evolve. Testing is a product-risk control, not a code-coverage contest.

The current highest-risk subsystem is ActionTray because it coordinates React
state, native layout, Reanimated worklets, gestures, keyboard state, safe-area
geometry, nested presentation, and paged navigation.

## 2. Quality principles

1. **Observable behavior is the compatibility specification.** Refactors must
   preserve public behavior unless acceptance criteria explicitly change it.
2. **Test contracts, not incidental implementation.** Black-box tests survive
   refactors; focused white-box tests protect race-sensitive internal invariants.
3. **A failure must be diagnosable.** Each test should establish one primary
   reason for failure and identify its coverage item.
4. **Risk determines depth.** Critical and major risks require positive,
   negative, boundary, state-transition, and regression coverage.
5. **Quality is shared.** Developers supply automated evidence before QA
   exploratory testing; QA adds independent product and experience-based views.
6. **Every escaped defect improves the system.** Add a regression test or a
   checklist/charter item and update the risk model.

## 3. Test levels

### 3.1 Pure contract tests

Target deterministic functions: option resolution, transition classification,
index clamping, measurement policy, render-window selection, and state models.

- Fast and exhaustive where input domains are finite.
- Primary techniques: EP, BVA, decision tables, branch testing.
- No native rendering or timers unless they are the test object.

### 3.2 Component and hook tests

Target React orchestration, provider behavior, render snapshots, and lifecycle
effects using `react-test-renderer` and controlled native mocks.

- Assert user-visible or contract-level outcomes.
- Keep mocks minimal and state their limitation in the test.
- Verify cleanup, interruption, rerender, and invalid/no-op paths.

### 3.3 Subsystem integration tests

Exercise runtime store → presenter → shell contracts together. These tests cover
the transition sequences most likely to regress while refactoring ownership.

- Primary technique: state-transition testing.
- Include forward, backward, close, interruption, nested, keyboard, and pages.
- Verify source/destination identity as well as the final active state.

### 3.4 Native/device tests

Jest cannot prove native frame timing, keyboard synchronization, gesture feel,
safe-area placement, accessibility focus, or visual continuity. These require
device/simulator execution and evidence from the ActionTray checklist.

Automation should eventually cover stable end-to-end paths, but frame-by-frame
animation review remains an intentional human test until a reliable visual
capture harness is introduced.

## 4. Test technique selection

| Technique | Use in Morpheus | Minimum evidence |
| --- | --- | --- |
| Equivalence partitioning | Options, modes, valid/invalid inputs | Every identified valid and invalid partition |
| 3-value BVA | Indexes, dimensions, scale values, thresholds | Boundary and both neighbors where meaningful |
| Decision tables | Close policy, fullscreen mode, footer/keyboard combinations | Every feasible rule or documented risk reduction |
| State transitions | Tray stack, steps, pages, keyboard, visibility | Every valid transition; invalid transitions for high-risk states |
| Statement/branch | Detect untested implementation paths | Coverage report plus targeted tests, never coverage alone |
| Error guessing | Known race, stale cache, remount, and native event patterns | Fault list linked to tests/checklist |
| Exploratory | Visual motion, usability, timing, unexpected sequences | Time-boxed charter and notes |
| Checklist | Release consistency and device qualities | Completed versioned checklist |

## 5. Risk-based depth

Risk score is `likelihood (1–5) × impact (1–5)`.

- 16–25: exhaustive decision/state coverage, negative tests, regression test,
  exploratory session, and explicit release evidence.
- 9–15: automated positive/negative/boundary coverage and focused checklist.
- 4–8: representative automated coverage and smoke verification.
- 1–3: test opportunistically or by broader regression coverage.

Severity is assigned to an observed defect; risk is assigned before failure.
They are related but not interchangeable.

## 6. Test pyramid and quadrants

- Most tests should be pure contract and component tests.
- Fewer tests should mount the complete tray provider/presenter.
- A focused native/device layer covers behavior Jest cannot observe.
- Business-facing tests confirm flows and acceptance criteria.
- Technology-facing tests cover structure, resilience, timing, and diagnostics.

## 7. Coverage policy

The initial ActionTray baseline was approximately 53% statements/lines, 54%
functions, and 46% branches. CI begins with a conservative ratchet:

- Statements: 50%
- Lines: 50%
- Functions: 50%
- Branches: 42%

Thresholds must only move upward. New or materially changed critical modules
should target at least 80% branch coverage, but a justified risk-based exception
is preferable to low-value assertions written solely to satisfy a number.

## 8. Entry criteria

- Acceptance criteria are unambiguous and testable.
- Test data and supported platforms are known.
- Code builds and type-checks.
- Required native dependencies are available.
- Known limitations and intended animation behavior are documented.

## 9. Exit criteria

- Lint, TypeScript, automated tests, and coverage gates pass.
- All applicable high-risk test conditions are exercised.
- No unresolved Critical defect.
- Major defects have an approved disposition and workaround assessment.
- Relevant exploratory/checklist testing is complete.
- Residual risks are recorded rather than silently accepted.

## 10. Flaky test policy

A flaky test is a defect in the test system. Do not normalize reruns as success.
Quarantine only with an owner, defect reference, reason, and expiry. Tests that
depend on native clocks must assert ordering/tolerance contracts rather than
exact wall-clock values unless exact timing is the requirement.

## 11. Change expectations

Every feature or bug fix should answer:

- What user contract changed or was protected?
- Which technique produced the test cases?
- Which risks and boundaries were covered?
- What cannot be automated at this level?
- What evidence shows the change is safe?
