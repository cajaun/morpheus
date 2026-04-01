import React, { useMemo, useEffect, useId } from "react";
import { useTray } from "./context";

const TrayScopeContext = React.createContext<string | null>(null);

export const useTrayScope = () => {
  return React.useContext(TrayScopeContext);
};

export const TrayRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { registerTray } = useTray();
  const reactId = useId();

  const trayId = useMemo(() => `tray-${reactId}`, [reactId]);

  const parsed = useMemo(() => {
    const outside: React.ReactNode[] = [];
    const contents: any[] = [];
    let footer: any;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        outside.push(child);
        return;
      }

      const name = (child.type as any)?.displayName;

      if (name === "TrayContent") {
        // Wrap each step in a factory so TrayProvider can inject runtime props
        // (stepKey, skipEntering, step, total) without re-parsing children.
        contents.push(
          (
            stepKey?: string,
            skipEntering?: boolean,
            skipExiting?: boolean,
            step?: number,
            total?: number
          ) =>
            React.cloneElement(child, {
              stepKey,
              skipEntering,
              skipExiting,
              step,
              total,
            })
        );
        return;
      }

      if (name === "TrayFooter") {
        footer = (step?: number, total?: number) =>
          React.cloneElement(child, { step, total });
        return;
      }

      outside.push(child);
    });

    return { outside, contents, footer };
  }, [children]);

  useEffect(() => {
    console.log("[TrayRoot] registerTray", {
      trayId,
      contentCount: parsed.contents.length,
      hasFooter: !!parsed.footer,
    });

    registerTray(trayId, {
      contents: parsed.contents,
      footer: parsed.footer,
    });
  }, [trayId, parsed.contents, parsed.footer, registerTray]);

  return (
    <TrayScopeContext.Provider value={trayId}>
      {parsed.outside}
    </TrayScopeContext.Provider>
  );
};

TrayRoot.displayName = "TrayRoot";