import { useEffect } from "react";
import type {
  TrayHostActionsValue,
  TrayPagesRegistration,
} from "../../runtime/types";

type Params = {
  activeIndex: number;
  activeStepKey: string | null;
  backPage: () => void;
  hasFooter: boolean;
  nextPage: () => void;
  pageIndex: number;
  progress: TrayPagesRegistration["progress"];
  registerTrayPages: TrayHostActionsValue["registerTrayPages"];
  setPage: (index: number) => void;
  totalPages: number;
  trayId: string | null;
};

// page registration publishes pager controls beside the active tray step
export const useTrayPagesRegistration = ({
  activeIndex,
  activeStepKey,
  backPage,
  hasFooter,
  nextPage,
  pageIndex,
  progress,
  registerTrayPages,
  setPage,
  totalPages,
  trayId,
}: Params) => {
  useEffect(() => {
    if (!trayId || !activeStepKey) {
      return;
    }

    registerTrayPages(trayId, {
      stepKey: activeStepKey,
      pageIndex,
      totalPages,
      hasFooter,
      canGoNext: pageIndex < totalPages - 1,
      canGoBack: pageIndex > 0,
      nextPage,
      backPage,
      setPage,
      progress,
    });

    return () => {
      registerTrayPages(trayId, null);
    };
  }, [
    activeIndex,
    activeStepKey,
    backPage,
    hasFooter,
    nextPage,
    pageIndex,
    progress,
    registerTrayPages,
    setPage,
    totalPages,
    trayId,
  ]);
};
