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

## Public API

The `Tray` namespace exposes the authoring primitives:

- `Tray.Root`, `Tray.Nested`, `Tray.Step`, and `Tray.Trigger`
- `Tray.Header`, `Tray.Body`, `Tray.Section`, `Tray.Footer`, and `Tray.Separator`
- `Tray.Pages`, `Tray.Page`, and `Tray.Pages.Header`
- `Tray.TextInput`

Each `Tray.Step` contains one content root and may place one header before it.
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
