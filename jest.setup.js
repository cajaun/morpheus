// Gesture Handler 3 asks Worklets for the UI runtime when it is imported.
// Under Jest there is no UI runtime, so use Worklets' own mock, which provides
// one. Older Worklets versions without the mock keep their default behaviour.
// Individual tests can still mock react-native-worklets themselves.
let hasWorkletsMock = false;

try {
  require.resolve("react-native-worklets/lib/module/mock");
  hasWorkletsMock = true;
} catch {
  hasWorkletsMock = false;
}

if (hasWorkletsMock) {
  jest.mock("react-native-worklets", () =>
    require("react-native-worklets/lib/module/mock"),
  );
}
