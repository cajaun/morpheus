# Morpheus

A morphing, multi-step tray for React Native and Expo. Morpheus supports sheet-to-sheet transitions, fullscreen flows, nested trays, keyboard-aware steps, tray pages, shared headers and footers, trigger-origin expansion, and explicit transition lifecycle contracts.

## Installation

```sh
npm install react-native-morpheus \
  expo-haptics \
  react-native-gesture-handler \
  react-native-keyboard-controller \
  react-native-reanimated \
  react-native-safe-area-context \
  react-native-worklets
```

Morpheus treats React, React Native, and the native integration libraries above as peer dependencies. Follow each native dependency's installation instructions for your React Native or Expo version.

### Requirements

Morpheus 3.0 requires React 19.2 or newer, which means React Native 0.83 or
newer (Expo SDK 55 or newer). Older setups can stay on Morpheus 2.x.

| Package | Minimum |
| --- | --- |
| `react` | 19.2.0 |
| `react-native` | 0.83.0 (New Architecture) |
| `react-native-reanimated` | 4.2.0 |
| `react-native-worklets` | 0.7.0 |
| `react-native-gesture-handler` | 2.30.0 (3.x supported) |
| `react-native-keyboard-controller` | 1.20.0 |
| `react-native-safe-area-context` | 5.6.0 |
| `expo-haptics` | 55.0.0 |

On Expo, `npx expo install` picks versions that match your SDK.

## App setup

Place `TrayProvider` inside the gesture-handler and keyboard providers. The presenter is mounted once by `TrayProvider`; individual trays only register their steps and render a trigger.

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { TrayProvider } from "react-native-morpheus";

export function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <TrayProvider>{/* app navigation */}</TrayProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
```

Ensure Reanimated and Worklets are configured for the versions used by your application.

## Basic tray

```tsx
import { Text } from "react-native";
import {
  Tray,
  useTrayNavigation,
  useTrayNavigationState,
} from "react-native-morpheus";

function TrayFooter() {
  const { next, close } = useTrayNavigation();
  const isLastStep = useTrayNavigationState(
    (state) => state.index >= state.total - 1,
  );

  return (
    <Tray.Footer>
      <Tray.PrimaryButton
        onPress={isLastStep ? close : next}
        style={{ backgroundColor: "#9896FF" }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 23,
            lineHeight: 28,
            fontWeight: "700",
          }}
        >
          Continue
        </Text>
      </Tray.PrimaryButton>
    </Tray.Footer>
  );
}

function BackAction() {
  const { back } = useTrayNavigation();

  return (
    <Tray.HeaderButton onPress={back}>
      <Text style={{ color: "#787878", fontSize: 28, lineHeight: 28 }}>
        ‹
      </Text>
    </Tray.HeaderButton>
  );
}

function StepHeader({
  title,
  canGoBack = false,
}: {
  title: string;
  canGoBack?: boolean;
}) {
  const { close } = useTrayNavigation();

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={canGoBack ? <BackAction /> : undefined}
        right={
          canGoBack ? undefined : (
            <Tray.HeaderButton onPress={close}>
              <Text style={{ color: "#787878", fontSize: 24 }}>×</Text>
            </Tray.HeaderButton>
          )
        }
      >
        <Text
          style={{
            fontSize: 25,
            lineHeight: 30,
            letterSpacing: 0.2,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
}

export function ProfileTray() {
  return (
    <Tray.Root footer={<TrayFooter />}>
      <Tray.Trigger>
        <Text>Open profile</Text>
      </Tray.Trigger>

      <Tray.Step>
        <StepHeader title="Content One" />
        <Tray.Body>
          <Tray.Section>
            <Text style={{ fontSize: 23, lineHeight: 28, fontWeight: "700" }}>
              This is a test title
            </Text>
            <Text style={{ fontSize: 23, lineHeight: 28 }}>
              This is some example test that spans over multiple lines bla bla
              bla test test test many words. This is a new sentence and we'll
              see how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <StepHeader title="Content Two" canGoBack />
        <Tray.Body>
          <Tray.Section>
            <Text style={{ fontSize: 23, lineHeight: 28, fontWeight: "700" }}>
              Different heading
            </Text>
            <Text style={{ fontSize: 23, lineHeight: 28 }}>
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem
              ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>
            <Text style={{ fontSize: 23, lineHeight: 28 }}>
              This is some example test that spans over multiple lines bla bla
              bla test test test many words. This is a new sentence and we'll
              see how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <StepHeader title="Content Three" canGoBack />
        <Tray.Body>
          <Tray.Section>
            <Text style={{ fontSize: 23, lineHeight: 28, fontWeight: "700" }}>
              Another heading
            </Text>
            <Text style={{ fontSize: 23, lineHeight: 28 }}>
              Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>
            <Text style={{ fontSize: 23, lineHeight: 28 }}>
              This is some example test that spans over multiple lines bla bla
              bla test test test many words. This is a new sentence and we'll
              see how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>
    </Tray.Root>
  );
}
```

## Step footers

Each step can declare its own footer by placing a `Tray.Footer` directly inside
`Tray.Step`, after the step's content. The footer stays pinned to the bottom of
the sheet, and the sheet reserves room for it.

```tsx
<Tray.Root>
  <Tray.Step>
    <StepHeader title="Details" />
    <DetailsBody />
    <Tray.Footer>
      <ContinueButton label="Continue" />
    </Tray.Footer>
  </Tray.Step>

  <Tray.Step>
    <StepHeader title="Review" canGoBack />
    <ReviewBody />
    <Tray.Footer exit="withContent">
      <ContinueButton label="Done" />
    </Tray.Footer>
  </Tray.Step>

  <Tray.Step>
    <StepHeader title="All set" canGoBack />
    <DoneBody />
  </Tray.Step>
</Tray.Root>
```

- **Consecutive footers stay on screen.** When two neighbouring steps both have a
  footer, one footer stays in place and only its contents update.
- **`id` marks a different footer.** Give a footer an `id` when it should be
  treated as a new footer: it enters with its step's content and the previous
  one leaves.
- **Entering and leaving.** A footer that arrives with a step comes in with that
  step's content. When the next step has another footer or none, the leaving
  footer fades in place by default, or leaves with its step's content when it
  has `exit="withContent"`.
- **Root footer.** A `footer` on `Tray.Root` is the default for every step that
  doesn't declare its own.

## Public API

The `Tray` namespace exposes the authoring primitives:

- `Tray.Root`, `Tray.Nested`, `Tray.Step`, and `Tray.Trigger`
- `Tray.Header`, `Tray.Body`, `Tray.Section`, `Tray.Footer`, and `Tray.Separator`
- `Tray.Pages`, `Tray.Page`, and `Tray.Pages.Header`
- `Tray.TextInput`

Each `Tray.Step` contains one content root, may place one header before it, and
may declare one `Tray.Footer` (see Step footers).
Root `stepOptions` are inherited by every step and can be overridden by
that step's `options` prop. `Tray.Root` and `Tray.Nested` no longer accept a
`steps` prop.

Consumer hooks include `useTrayNavigation`, `useTrayNavigationState`, `useTrayKeyboard`, `useTrayPages`,
`useOptionalTrayPages`, and `useTrayProgress`. Focused animation hooks include
`useTrayMorphProgress` and `useTrayOriginProgress`. Advanced integrations can
use `useTrayHost` and `useTrayTransitionLifecycle`.

`useTrayNavigation` returns navigation commands (`next`, `back`, `close`,
`requestClose`, `open`, `closeAndNextParentPage`). It subscribes to no state,
so pressing next or back never re-renders the step being left; commands read
the latest state when pressed. Use `useTrayNavigationState` only in components
that render navigation state, and pass a selector so they re-render only when
that slice changes:

```tsx
const index = useTrayNavigationState((state) => state.index);
```

### Preloading neighbouring steps

By default, while a step is on screen Morpheus keeps the next and the previous
step rendered inside a hidden React `<Activity>`. They render at low priority
after the current step, take no space, and their effects (data fetching,
subscriptions) start only once shown. Moving forward or back then reuses the
rendered step instead of mounting it after the tap; it still animates in on the
same transition clock as the sheet. This applies to fullscreen steps too.

- Only the two neighbours are kept rendered, so at most two extra steps are in
  memory.
- A newly needed neighbour is rendered once the current transition finishes,
  so preloading never competes with a step change that is starting. Moving
  again before that mounts the step on the tap, as without preloading.
- The step you just left is removed (so its exit animation plays) and is
  rendered hidden again once the transition finishes. Like any remount, it
  starts with fresh component state.
- Code that runs during render (not in effects) runs while the step is still
  hidden. Opt a step out to mount it on the tap instead:

```tsx
<Tray.Step key="checkout" options={{ preload: false }}>
  <CheckoutStep />
</Tray.Step>
```

### Migrating to 3.0

In 2.x, `useTrayNavigation` also returned `index`, `total`, `isActive`,
`canGoNext`, `canGoBack` and `pageIndex`, which re-rendered every consumer on
every step change. In 3.0 those fields moved to `useTrayNavigationState`:

```tsx
// 2.x
const { next, index, total } = useTrayNavigation();

// 3.0
const { next } = useTrayNavigation();
const { index, total } = useTrayNavigationState();
```

`useTrayNavigationActions` remains as a deprecated alias of `useTrayNavigation`.

3.0 also raises the minimum versions: React 19.2+, React Native 0.83+ (Expo
SDK 55+). See [Requirements](#requirements). Apps on Expo SDK 54 or older, or
React Native 0.82 or older, should stay on 2.x until they upgrade.

Package-level layout constants that are intentionally public are available from `react-native-morpheus/constants`.

## Repository structure

```text
src/                  Publishable package source
  core/               Tray controller, animation, input, and constants
  primitives/         Public authoring primitives
  runtime/            Store, presenter, lifecycle, and contracts
  telemetry/          Opt-in diagnostics
example/              Expo development and integration application
quality/              QA strategy, charters, checklists, and test design
scripts/              Package verification tooling
lib/                  Generated JavaScript and declarations (not committed)
```

The example application imports from `react-native-morpheus`, not from internal source paths. This keeps local development on the same package boundary consumers use.

## Development

```sh
npm install
npm run start
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm run pack:check
```

`npm run quality` runs the complete release gate: linting, type checking, coverage tests, package compilation, and tarball-content verification.

The npm build is generated with [React Native Builder Bob](https://oss.callstack.com/react-native-builder-bob/build). Before a public release, replace the current `UNLICENSED` package metadata with the intended license.
