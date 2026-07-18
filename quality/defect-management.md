# Defect Management

## Severity spectrum

Severity is determined by user/business impact and availability of a safe
workaround. Priority may additionally consider release timing and frequency.

### Critical

Core access, security, financial/data integrity, or unrecoverable application
failure affecting users with no effective workaround.

Examples for Morpheus: unauthorized wallet action, irreversible wrong-wallet
operation, application cannot start, or widespread data corruption.

### Major

A primary flow is unavailable or materially incorrect for all users or a
significant subset, but a safe workaround may exist.

Examples: tray cannot close, keyboard step loses all content, fullscreen flow
navigates to the wrong action, or nested tray blocks its parent permanently.

### Minor

Moderate feature or user-experience impact without making the overall flow
unusable. Examples: animation starts a frame early, content reflows during a
morph, stale height produces incorrect spacing, or accessibility focus is poor.

### Trivial

Cosmetic, typographical, or low-impact inconsistency that does not prevent the
task. Frequency and affected scope can raise severity.

## Required defect fields

- Defect ID and concise title.
- Environment, build/commit, device, OS, and configuration.
- Severity and impact justification.
- Preconditions and deterministic reproduction steps.
- Expected and actual results.
- Frequency and affected scope.
- Evidence: screenshot/video, logs, timestamps, and relevant transition IDs.
- Workaround and recovery behavior.
- Suspected component, without presenting an unverified cause as fact.
- Discovery phase: developer, QA, pre-release, or production.
- Regression test/checklist update required for closure.

## Root-cause categories

- Requirements/acceptance ambiguity
- State/logic
- Timing/concurrency
- Lifecycle/cleanup
- Measurement/geometry
- Interface/contract mismatch
- Native/platform variance
- Accessibility/usability
- Performance/resource
- Test gap

## Metrics

- Escaped defect ratio = external defects / all defects.
- Critical escaped defect ratio = external critical defects / all critical defects.
- Post-development defect count = defects found after developer handoff.
- Reopen rate and defect recurrence rate.
- Defects by root-cause category and subsystem.

Targets inherited from the supplied standard are escaped defects ≤5% and
critical escaped defects ≤3%. Metrics are signals for process improvement, not
incentives to suppress or reclassify valid defects.

## Closure rule

A defect is not closed merely because code changed. Closure requires successful
retest, relevant regression evidence, classification of root cause, and an
updated automated test, checklist, or explicit explanation of why automation is
not viable.
