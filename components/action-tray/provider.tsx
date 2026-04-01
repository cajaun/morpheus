import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { ActionTray } from "@/components/action-tray/action-tray";
import { TrayContext, TrayDefinition } from "./context";

export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [registry, setRegistry] = useState<Record<string, TrayDefinition>>({});
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  // Ref so next/back callbacks always see the current total without being
  // recreated every time total changes.
  const totalRef = useRef(0);

  // Tracks whether the tray was just opened so we can suppress the entering
  // animation on step 0 and the open spring already provides that motion.
  const justOpenedRef = useRef(false);

  const registerTray = useCallback((id: string, def: TrayDefinition) => {
    setRegistry((prev) => ({ ...prev, [id]: def }));
  }, []);

  const openTray = useCallback((id: string) => {
    justOpenedRef.current = true;
    setIndex(0);
    setActiveTrayId(id);
  }, []);

  const close = useCallback(() => {
    setActiveTrayId(null);
    setIndex(0);
  }, []);

  const activeTray = activeTrayId ? registry[activeTrayId] : undefined;
  const total = activeTray?.contents.length ?? 0;

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  const safeIndex =
    total > 0 ? Math.max(0, Math.min(index, total - 1)) : 0;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, totalRef.current - 1));
  }, []);

  const back = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  console.log("[TrayProvider] renderContent", {
    activeTrayId,
    safeIndex,
    total,
  });

  // skipEntering is true only on the very first step of a fresh open so the
  // content doesn't animate in twice (once with the tray spring, once itself).
  const isFirstRender = justOpenedRef.current && safeIndex === 0;

  const rawContent =
    activeTray?.contents[safeIndex]?.(
      `${activeTrayId}-${safeIndex}`,
      isFirstRender,
      false,
      safeIndex,
      total
    ) ?? null;

  const footer = activeTray?.footer?.(safeIndex, total) ?? null;

  const ctxValue = useMemo(
    () => ({
      openTray,
      close,
      next,
      back,
      index: safeIndex,
      total,
      registerTray,
      registerFocusable: () => {},
    }),
    [openTray, close, next, back, safeIndex, total, registerTray]
  );

  useEffect(() => {
    console.log("[TrayProvider] state", {
      activeTrayId,
      index,
      safeIndex,
      total,
    });
  }, [activeTrayId, index, safeIndex, total]);

  // Clear justOpenedRef after the activeTrayId commit so the flag is only
  // consumed once by the first render of the newly opened tray.
  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  return (
    <TrayContext.Provider value={ctxValue}>
      {children}

      {/* trayId encodes activeTrayId + safeIndex so ActionTray's step-change
          effect fires whenever either the tray or the step changes. */}
      <ActionTray
        visible={activeTrayId !== null}
        content={rawContent}
        footer={footer}
        onClose={close}
        trayId={
          activeTrayId
            ? `${activeTrayId}-${safeIndex}`
            : undefined
        }
      />
    </TrayContext.Provider>
  );
};