# React Native Morpheus

React Native Morpheus is an Expo app that explores one UI problem: how to present layered action trays that can behave like a bottom sheet, a step flow, or a full screen task without rewriting the state model for each case.

The app has no backend service in this repository. No REST client, GraphQL client, auth client, database client, or server code exists in the current tree. The network usage in the demo set is limited to placeholder avatar image URLs inside sample screens.

## Demo

https://github.com/user-attachments/assets/734017af-3113-4806-a7d8-346c387e92b1

## Purpose

The codebase acts as both a demo app and a local component system.

- The demo app lives in [`app/index.tsx`](./app/index.tsx) and [`features/tray-demos`](./features/tray-demos)
- The tray system lives in [`features/action-tray`](./features/action-tray)
- The tray system exposes a small public API built from components, hooks, and step options
- The demos prove that one runtime can drive short sheets, multi step flows, text input flows, and full screen tasks

## Stack

### Runtime stack

- Expo 54 runs the app shell, Metro integration, native config, and prebuild flow
- React 19 renders the component tree
- React Native 0.81 renders native views
- Expo Router provides the app entry and route layout
- React Native Gesture Handler owns drag gestures
- React Native Reanimated owns tray motion, layout transitions, and page interpolation
- Expo Haptics fires trigger feedback
- Expo Font loads the SF Pro Rounded family from local assets
- Uniwind and Tailwind CSS v4 provide utility class support for React Native styles

### Tooling stack

- TypeScript runs in strict mode
- Jest with `jest-expo` covers runtime behavior
- ESLint uses the Expo config
- Expo Dev Client is installed, which fits the native `ios` project checked into the repo

### Why this stack exists

- Expo keeps native setup small while keeping access to native modules such as haptics, splash screen, fonts, and dev client
- Reanimated and Gesture Handler fit this UI problem because tray motion must stay on the UI thread during drag and spring updates
- Expo Router keeps the app boot path small. The app has one screen now, but the router layout already handles app level providers
- Uniwind lets the code mix utility classes with inline numeric styles. That matters in tray work where spacing, colors, and typography tokens change often during iteration

## App entry and boot flow

The boot path is short.

1. Expo starts from `expo-router/entry`, defined in [`package.json`](./package.json)
2. [`app/_layout.tsx`](./app/_layout.tsx) loads fonts, wraps the app in `GestureHandlerRootView`, and mounts `TrayProvider`
3. [`app/index.tsx`](./app/index.tsx) renders `ActionTrayExamples`
4. [`features/tray-demos/index.tsx`](./features/tray-demos/index.tsx) renders the demo triggers
5. Each trigger mounts one `Tray.Root` instance with a step definition array

The font gate in `app/_layout.tsx` returns `null` until the SF Pro Rounded files load. That avoids text reflow between fallback fonts and the real font family.

## Internal API

The tray system exposes one public entry in [`features/action-tray/index.ts`](./features/action-tray/index.ts).

### Components

#### `Tray.Root`

`Tray.Root` registers one tray definition with the runtime store.

Inputs:

- `steps: TrayStepDefinition[]`
- `footer?: React.ReactNode`
- `id?: string`
- `children: React.ReactNode`

Behavior:

- creates a stable tray id with `useId` when no `id` prop exists
- registers the tray on mount
- unregisters the tray on unmount
- scopes child components so `Tray.Trigger` and `useTrayFlow` know which tray they control

Why it works this way:

- registration separates tray definition from tray presentation
- the trigger can live near the screen content while the visual tray surface stays mounted once in the provider
- unregistration keeps the runtime store in sync with React mount state

#### `Tray.Trigger`

`Tray.Trigger` is a `Pressable` that opens the tray registered by the surrounding `Tray.Root`.

Inputs:

- all `PressableProps`
- `children`
- `haptics?: TrayTriggerHaptics`

Behavior:

- records open timing telemetry
- fires haptics
- runs the caller `onPress`
- opens the tray in the host store

Why it works this way:

- the trigger owns the user intent boundary
- telemetry starts at the press event, not after the runtime updates state
- the tray can open from any custom trigger UI because `Tray.Trigger` wraps children instead of forcing a fixed button component

#### `Tray.Body`, `Tray.Header`, `Tray.Section`, `Tray.Footer`, `Tray.Separator`

These primitives shape tray content. They keep demo screens consistent and reduce layout duplication.

Why this layer exists:

- the shell spacing, padding, and separators repeat across flows
- the demos need shared building blocks without forcing one large screen component

#### `Tray.TextInput`

`Tray.TextInput` wraps `TextInput` and registers focusable refs with the tray runtime.

Behavior:

- registers itself under the current tray id
- calls `anticipateKeyboard` before focus
- keeps `autoFocus` off at the native prop level and drives focus after the anticipation step

Why it works this way:

- the tray must move before the keyboard covers input fields
- the runtime needs a list of focusable refs so it can blur them during close and step changes

#### `Tray.Pages` and `Tray.Page`

`Tray.Pages` manages page level navigation inside one tray step. `Tray.Page` marks each page.

Behavior:

- parses `Tray.Pages.Header`, `Tray.Page`, and `Tray.Pages.Footer`
- tracks `pageIndex` in local component state
- animates horizontal page movement with a shared Reanimated value
- exposes `useTrayPages` for page controls

Why it exists beside tray steps:

- tray steps and page scenes solve different problems
- tray steps change the outer shell state, footer, full screen mode, and close behavior
- page scenes keep the same tray shell and swap content inside it

That split matters. A form wizard can use one tray step with several pages. A shell to full screen transition uses two tray steps because the shell contract changes.

### Hooks

#### `useTrayFlow`

`useTrayFlow` is the main per tray control hook.

It returns:

- `trayId`
- `isActive`
- `index`
- `total`
- `canGoNext`
- `canGoBack`
- `open()`
- `close()`
- `requestClose()`
- `next()`
- `back()`
- `anticipateKeyboard()`
- `dismissKeyboard()`

Use it inside content or footer components that sit under `Tray.Root`.

#### `useTrayHost`

`useTrayHost` exposes the full runtime state and host actions.

It includes:

- the tray registry
- `activeTrayId`
- `activeIndex`
- `keyboardHeight`
- registration actions
- open and close actions
- step navigation actions

Use it for tests, debugging, or runtime tooling. Demo screens do not need it for normal flow logic.

#### `useTrayPages`

`useTrayPages` controls page level movement inside `Tray.Pages`.

It returns:

- `pageIndex`
- `totalPages`
- `canGoNext`
- `canGoBack`
- `nextPage()`
- `backPage()`
- `setPage(index)`
- `progress`

## Step model

Each tray step uses this shape:

```ts
type TrayStepDefinition = {
  key: string
  content: React.ReactNode
  options?: {
    scale?: boolean
    fullScreen?: boolean
    fullScreenDraggable?: boolean
    fullScreenCloseBehavior?: "dismiss" | "returnToShell"
    fullScreenTransition?: "morph" | "slide"
    style?: StyleProp<ViewStyle>
    className?: string
    footerStyle?: StyleProp<ViewStyle>
    footerClassName?: string
  }
}
```

`key` identifies the step inside a tray. The presenter combines `trayId` and `step.key` into a rendered tray id such as `send-send-flow-send`.

### Why options live on steps

The shell can change from one step to the next.

Examples:

- a sheet can open as a compact action list and expand into a full screen task
- one step can allow drag to dismiss while the next step blocks drag
- a later step can swap the tray background and footer styling without remounting the whole tray tree

Per step options let the runtime treat the tray as a flow of presentations, not a single fixed bottom sheet.

## Runtime architecture

The tray runtime has four layers.

### 1. Registration layer

[`features/action-tray/system/runtime/tray-root.tsx`](./features/action-tray/system/runtime/tray-root.tsx) turns `steps` and `footer` into a registration object and stores it in the host runtime.

Result:

- the runtime knows every tray that exists in the mounted React tree
- opening a tray becomes a state update, not a mount request sent down a prop chain

### 2. Store layer

[`features/action-tray/system/runtime/store/create-tray-runtime-store.ts`](./features/action-tray/system/runtime/store/create-tray-runtime-store.ts) owns the canonical tray state.

State fields:

- `registry`
- `activeTrayId`
- `activeIndex`
- `keyboardHeight`

Actions:

- `registerTray`
- `unregisterTray`
- `openTray`
- `closeActiveTray`
- `requestCloseActiveTray`
- `nextStep`
- `previousStep`
- `anticipateKeyboard`
- `dismissKeyboardForTray`
- `registerFocusable`

Why a manual external store exists:

- the presenter, triggers, and content hooks all need access to the same state
- `useSyncExternalStore` gives a stable subscription contract
- the runtime can update without pushing one large React context value through the whole tree on each small action

### 3. Presenter layer

[`features/action-tray/system/runtime/tray-presenter.tsx`](./features/action-tray/system/runtime/tray-presenter.tsx) converts the active registration entry into rendered tray content.

The presenter uses a two slot host pool.

Reason:

- one slot can animate out while the next slot waits
- opening a second tray does not need to destroy the first tray before the close animation finishes
- the mounted host count stays bounded at two, proven by the runtime tests

This choice avoids a common sheet bug where content swaps before the old shell finishes closing.

### 4. Surface layer

[`features/action-tray/system/core/action-tray.tsx`](./features/action-tray/system/core/action-tray.tsx) renders the actual surface, gesture detector, backdrop, footer, and animated styles.

Responsibilities:

- measure content and footer height
- apply drag gestures
- apply layout transitions
- show a separate footer surface when present
- handle full screen fill behavior

## Open and close logic

The control path starts at the trigger and ends in the presenter.

1. `Tray.Trigger` records the press time and calls `openTray`
2. `openTray` sets `activeTrayId`, resets `activeIndex` to `0`, dismisses old focused inputs, and marks the tray as `justOpened`
3. `TrayPresenter` reads the active tray registration and resolves the current step options
4. `ActionTray` mounts the current content and footer
5. Telemetry marks open start, ready state, and finish state

`requestCloseActiveTray` has special logic for full screen steps with `fullScreenCloseBehavior: "returnToShell"`.

Result:

- if the active step is full screen and not the first step, the runtime moves back one step
- if not, the runtime dismisses the tray

That rule lets a tray behave like a compact shell that expands into a task screen. A close gesture or close button returns the user to the shell first, which matches the mental model of backing out of the task instead of losing the whole tray at once.

## Keyboard logic

[`features/action-tray/system/core/input/use-action-tray-keyboard.ts`](./features/action-tray/system/core/input/use-action-tray-keyboard.ts) keeps the tray above the keyboard.

The hook:

- stores keyboard height in a shared value
- listens to iOS `keyboardWillShow`, `keyboardWillChangeFrame`, and `keyboardWillHide`
- listens to Android `keyboardDidShow` and `keyboardDidHide`
- estimates keyboard height before the native event arrives on iOS

Why the anticipation step exists:

- native keyboard events land after the focus request begins
- if the tray waits for the event, the keyboard can cover the focused field for a frame
- a short estimate moves the tray early, then the real event corrects the final height

## Gesture logic

[`features/action-tray/system/core/input/use-action-tray-gesture.ts`](./features/action-tray/system/core/input/use-action-tray-gesture.ts) owns drag to dismiss.

Rules:

- drag is disabled for full screen steps when `fullScreenDraggable` is `false`
- upward drag gets resistance instead of full travel
- close fires when translation passes `40%` of tray height or when velocity passes the fast swipe threshold
- incomplete drags spring back to zero

Why the thresholds are simple:

- trays need a dismissal rule that feels stable
- the close decision depends on distance and velocity, not a large state machine

## Styling system

The styling approach mixes utility classes and typed tokens.

Files:

- [`global.css`](./global.css) registers font family names for Uniwind
- [`shared/theme/tokens.ts`](./shared/theme/tokens.ts) stores colors, radii, and text styles
- tray steps pass `className` and `style` through step options for shell level styling

Why mix classes and inline styles:

- utility classes make repetitive font and color changes fast
- inline objects work well for numeric values, animated styles, and shared tokens
- the tray shell needs both

## Demo set

The demo launcher renders these trays:

- `Onboarding`
- `Pay From`
- `Send`
- `Watch Address`
- `Help Support`
- `Watching Wallets Info`
- `Creating Wallets Info`
- `About Aave`
- `Identity Rate Boost`
- `Wallet Group`

Each demo sits in [`features/tray-demos`](./features/tray-demos).

### Example: `Send`

[`features/tray-demos/send/index.tsx`](./features/tray-demos/send/index.tsx) shows the main design pattern in the repo.

- step one is a shell screen that lets the user choose an action
- step two is a full screen flow keyed by the selected action
- close from step two returns to step one because `fullScreenCloseBehavior` is `returnToShell`

That example shows why the tray step model exists. The outer shell changes shape between the two steps, so page level navigation alone would not fit.

### Example: `Onboarding`

[`features/tray-demos/onboarding/index.tsx`](./features/tray-demos/onboarding/index.tsx) shows a multi step tray with a shared footer.

- the steps array controls the content sequence
- the footer calls `useTrayFlow` so one control surface drives next, back, and finish

This pattern keeps navigation logic out of the step bodies.

## File map

```text
app/
  _layout.tsx            app shell, fonts, gesture root, tray provider
  index.tsx              demo screen entry

features/
  action-tray/
    index.ts             public exports
    presets/             shared demo header and button parts
    system/
      core/              tray surface, animation, controller, gesture, keyboard
      primitives/        public building blocks
      runtime/           store, provider, presenter, context
      telemetry/         open timing traces
  tray-demos/            concrete tray examples

shared/
  theme/tokens.ts        shared visual tokens
  ui/                    shared small UI helpers

archive/
  morphing-text/         older experimental text morphing work
```

## Commands

Install dependencies:

```bash
npm install
```

Start the Expo dev server:

```bash
npx expo start
```

Run iOS:

```bash
npm run ios
```

Run Android:

```bash
npm run android
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

## Native setup

The checked in `ios` directory means this project is not relying on a pure managed workflow at runtime. Expo still owns the app config, but the project has been prebuilt so native iOS files can live in source control.

That matches the dependency set:

- `expo-dev-client` exists
- custom fonts are bundled from local assets
- the app uses native modules for gestures, haptics, splash screen, and reanimated

## Testing

The current test file is [`features/action-tray/system/runtime/__tests__/tray-provider.test.tsx`](./features/action-tray/system/runtime/__tests__/tray-provider.test.tsx).

It covers these runtime guarantees:

- tray registration and cleanup
- open, next, and back actions
- full screen close behavior that returns to shell
- step definition updates without id churn
- the presenter host pool stays capped at two

Those tests focus on state transitions because the tray system depends on a small set of strict rules. If those rules hold, the surface layer has a stable contract to animate.

## Boundaries

The repository does not contain:

- backend routes
- persistence storage
- remote data fetch flows
- user auth flows
- production analytics transport

The telemetry file stores recent open timing summaries on `globalThis` and logs them to the console. That gives the team a local performance trace without adding a server dependency.

## How to add a new tray

1. Create a new folder under [`features/tray-demos`](./features/tray-demos)
2. Build the tray body from `Tray` primitives
3. Define a `steps` array with stable `key` values
4. Wrap the trigger UI in `Tray.Root` and `Tray.Trigger`
5. Use `useTrayFlow` for step navigation
6. Use `Tray.Pages` only when the shell stays the same and the content changes inside it

## Decision notes

### One provider for the whole app

One `TrayProvider` sits near the root so every screen can register trays without mounting its own presenter. That avoids competing backdrops, duplicate gesture layers, and state collisions.

### External store instead of local reducer trees

The tray system has one active tray at a time. A single external store fits that model and keeps cross component coordination small.

### Two host slots instead of one

Animation work needs overlap. One slot cannot animate out and render the next tray at the same time without content churn.

### Step options instead of one tray config object

Presentation rules change during a flow. Per step options encode that change close to the content that needs it.

## Summary

This repository is a focused React Native tray system built on Expo, Reanimated, and Gesture Handler. The main API is internal to the app: `Tray.Root`, `Tray.Trigger`, `useTrayFlow`, `Tray.Pages`, and the runtime store behind them. The design favors one global presenter, per tray registration, per step shell options, and a two slot host pool so transitions stay controlled.
