import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

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
  // pages consumers should fail fast when mounted outside the pages boundary
  const ctx = useContext(TrayPagesContext);

  if (!ctx) {
    throw new Error("Must be used within Tray.Pages");
  }

  return ctx;
};
