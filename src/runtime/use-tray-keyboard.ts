import {
  useTrayHostActions,
  useTrayScope,
} from "./tray-store-context";

// keyboard controls manage focus and keyboard handoff, apart from navigation
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
