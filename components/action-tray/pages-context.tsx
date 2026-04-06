import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

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

  if (!ctx) {
    throw new Error("Must be used within Tray.Pages");
  }

  return ctx;
};
