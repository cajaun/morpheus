import { createContext, useContext } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useTrayHostSelector, useTrayScope } from "./runtime/tray-context";

// page state stays local because pages leave shell semantics unchanged
type TrayPagesContextValue = {
  pageIndex: number;
  totalPages: number;
  canGoNext: boolean;
  canGoBack: boolean;
  nextPage: () => void;
  backPage: () => void;
  setPage: (index: number) => void;
  progress: SharedValue<number>;
};

const TrayPagesContext = createContext<TrayPagesContextValue | null>(null);

export const TrayPagesProvider = TrayPagesContext.Provider;

// local page state first, registered runtime state as the fallback
export const useTrayPages = () => {
  const ctx = useContext(TrayPagesContext);
  const trayId = useTrayScope();
  const fallbackProgress = useSharedValue(0);
  const registeredPages = useTrayHostSelector((state) =>
    trayId ? state.registry[trayId]?.pages : undefined,
  );

  if (ctx) {
    return ctx;
  }

  if (registeredPages) {
    return registeredPages;
  }

  return {
    pageIndex: 0,
    totalPages: 0,
    canGoNext: false,
    canGoBack: false,
    nextPage: () => {},
    backPage: () => {},
    setPage: () => {},
    progress: fallbackProgress,
  };
};

// page state without a pages provider
export const useOptionalTrayPages = () => useContext(TrayPagesContext);
