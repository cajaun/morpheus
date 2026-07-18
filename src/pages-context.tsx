import React, { createContext, useContext } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useTrayHostSelector, useTrayScope } from "./runtime/tray-context";

// page state stays local because tray steps change shell semantics while pages do not
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

export const useOptionalTrayPages = () => useContext(TrayPagesContext);
