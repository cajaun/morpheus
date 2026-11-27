
import type {
  TrayHostActionsValue,
  TrayPagesRegistration,
} from "../../runtime/types";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

type Params = {
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
  // the registration lives as long as its owner and step, page changes update the payload without an unmount and an extra store notification
  useProfiledTrayEffect("primitives/pages/use-tray-pages-registration#1", () => {
    if (!trayId || !activeStepKey) {
      return;
    }

    return () => {
      registerTrayPages(trayId, null);
    };
  }, [activeStepKey, registerTrayPages, trayId]);

  useProfiledTrayEffect("primitives/pages/use-tray-pages-registration#2", () => {
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
  }, [
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
