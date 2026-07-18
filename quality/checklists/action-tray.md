# ActionTray Release Checklist

Record build, commit, device, OS, theme, text size, and result for every session.

## Core navigation

- [ ] Can each tray open, close, reopen, and close repeatedly?
- [ ] Do next and back preserve the intended header, body, footer, and state?
- [ ] Are invalid/no-op next/back actions visually silent?
- [ ] Does closing from every fullscreen page use the intended destination?
- [ ] Does forward fullscreen exit work when it differs from the entry step?

## Visual continuity

- [ ] Incoming content begins with shell motion—no faded head start.
- [ ] Outgoing content remains in its intended body/section coordinate space.
- [ ] Header controls do not jump, pulse, duplicate, or cross safe-area bounds.
- [ ] Text does not rewrap during morph unless explicitly designed to do so.
- [ ] Footer width and horizontal margins remain intentional throughout morph.
- [ ] Rounded corners, fill, backdrop, and background scale remain continuous.
- [ ] Close animation starts from the exact visible fullscreen frame.

## Keyboard and input

- [ ] Keyboard-aware morph begins in coordination with native keyboard movement.
- [ ] Tray remains visible while keyboard appears/disappears.
- [ ] Focus lands on the intended field and returns safely after nested trays.
- [ ] Rapid back/next/close during keyboard movement recovers cleanly.
- [ ] Hardware keyboard and software keyboard paths are both usable.

## Nested and interruption behavior

- [ ] Nested tray preserves parent page and transition state.
- [ ] Closing nested tray restores parent interaction and accessibility focus.
- [ ] Rapid repeated taps do not create extra hosts or stale content.
- [ ] Closing during enter/exit leaves no invisible blocking surface.
- [ ] Background/foreground interruption returns to a coherent state.

## Accessibility and adaptability

- [ ] VoiceOver/TalkBack identifies controls, headings, fields, and progress.
- [ ] Modal focus is trapped appropriately and restored on close.
- [ ] Dynamic text sizes do not clip essential controls or prevent completion.
- [ ] Reduced Motion produces an understandable transition.
- [ ] Light/dark themes preserve contrast and surface boundaries.
- [ ] Supported device sizes and safe areas preserve tappable controls.

## Performance

- [ ] Representative heavy content does not visibly stall first interaction.
- [ ] Repeated open/close and page navigation do not degrade over time.
- [ ] Instrumentation-disabled builds do not emit QA telemetry or change timing.
- [ ] No sustained memory growth is observed during a navigation soak.
