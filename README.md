# Morpheus

A morphing, multi-step action tray for React Native and Expo. Morpheus supports sheet-to-sheet transitions, fullscreen flows, nested trays, keyboard-aware steps, tray pages, shared headers and footers, trigger-origin expansion, and explicit transition lifecycle contracts.

## Installation

```sh
npm install morpheus \
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
import { TrayProvider } from "morpheus";

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
import { Button, Text } from "react-native";
import { Tray, useTrayFlow } from "morpheus";

function TrayFooter() {
  const { next, close, index, total } = useTrayFlow();

  return (
    <Tray.Footer>
      <Button
        title={index === total - 1 ? "Done" : "Continue"}
        onPress={index === total - 1 ? close : next}
      />
    </Tray.Footer>
  );
}

export function ProfileTray() {
  return (
    <Tray.Root footer={<TrayFooter />}>
      <Tray.Trigger>
        <Text>Open profile</Text>
      </Tray.Trigger>

      <Tray.Step key="profile">
        <Tray.Header withSeparator>
          <Text>Profile</Text>
        </Tray.Header>
        <Tray.Body>
          <Tray.Section>
            <Text>Choose your profile settings.</Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step
        key="confirmation"
        options={{ fullScreen: true, fullScreenSafeAreaTop: true }}
      >
        <Tray.Body>
          <Tray.Section>
            <Text>Ready to continue.</Text>
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

Flow and integration hooks include `useTrayFlow`, `useTrayPages`, `useOptionalTrayPages`, `useTrayOriginProgress`, `useTrayHost`, and `useTrayTransitionLifecycle`.

Package-level layout constants that are intentionally public are available from `morpheus/constants`.

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

The example application imports from `morpheus`, not from internal source paths. This keeps local development on the same package boundary consumers use.

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

The npm build is generated with [React Native Builder Bob](https://oss.callstack.com/react-native-builder-bob/build). Before a public release, choose the final npm package name and replace the current `UNLICENSED` package metadata with the intended license.
