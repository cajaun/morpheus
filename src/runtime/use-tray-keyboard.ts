import {
  useTrayHostActions,
  useTrayScope,
} from "./tray-store-context";

// keyboard controls are kept separate from navigation because they manage
// input focus and keyboard handoff rather than tray position
export const useTrayKeyboard = () => {
  const trayId = useTrayScope();
  const { anticipateKeyboard, dismissKeyboardForTray } = useTrayHostActions();

  if (!trayId) {
    throw new Error("Must be used within Tray.Root scope");
  }

  return {
    anticipate: anticipateKeyboard,
    dismiss: () => dismissKeyboardForTray(trayId),
  };
};
