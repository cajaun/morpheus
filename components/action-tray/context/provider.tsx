import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { ActionTray } from "@/components/action-tray/core/action-tray";
import { TrayContext, TrayDefinition } from "./context";

export const TrayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [registry, setRegistry] = useState<Record<string, TrayDefinition>>({});
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const totalRef = useRef(0);
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

  const safeIndex = total > 0 ? Math.max(0, Math.min(index, total - 1)) : 0;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, totalRef.current - 1));
  }, []);

  const back = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    if (justOpenedRef.current && activeTrayId !== null) {
      justOpenedRef.current = false;
    }
  }, [activeTrayId]);

  const ctxValue = useMemo(
    () => ({
      activeTrayId,
      openTray,
      close,
      next,
      back,
      index: safeIndex,
      total,
      registerTray,
      registerFocusable: () => {},
    }),
    [activeTrayId, openTray, close, next, back, safeIndex, total, registerTray],
  );

  return (
    <TrayContext.Provider value={ctxValue}>
      {children}

      {/* Render one ActionTray per registered tray — all at root level so
          position: absolute resolves against the screen, not a child container. */}
      {Object.entries(registry).map(([trayId, def]) => {
        const isActive = activeTrayId === trayId;
        const trayTotal = def.contents.length;
        const trayIndex = isActive
          ? Math.max(0, Math.min(safeIndex, trayTotal - 1))
          : 0;

        const isFirstRender = justOpenedRef.current && trayIndex === 0;

        const isFullScreen = def.fullScreenSteps?.[trayIndex] ?? false;

        const rawContent = isActive
          ? (def.contents[trayIndex]?.(
              `${trayId}-${trayIndex}`,
              isFirstRender,
              false,
              trayIndex,
              trayTotal,
              isFullScreen,
            ) ?? null)
          : null;

        const footer = isActive
          ? (def.footer?.(trayIndex, trayTotal) ?? null)
          : null;

        return (
          <ActionTray
            key={trayId}
            visible={isActive}
            content={rawContent}
            footer={footer}
            onClose={close}
            trayId={isActive ? `${trayId}-${trayIndex}` : undefined}
            fullScreen={isFullScreen}
          />
        );
      })}
    </TrayContext.Provider>
  );
};
