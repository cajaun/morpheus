import React, { useMemo, useEffect, useId } from "react";
import { useTray } from "./context";

const TrayScopeContext = React.createContext<string | null>(null);

export const useTrayScope = () => React.useContext(TrayScopeContext);

export const TrayRoot: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { registerTray } = useTray();
  const reactId = useId();
  const trayId = useMemo(() => `tray-${reactId}`, [reactId]);

  const parsed = useMemo(() => {
    const outside: React.ReactNode[] = [];
    const fullScreenSteps: boolean[] = [];
    const contents: any[] = [];
    let footer: any;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        outside.push(child);
        return;
      }

      const name = (child.type as any)?.displayName;

      if (name === "TrayContent") {
        fullScreenSteps.push(!!(child.props as any).fullScreen);
        contents.push(
          (
            stepKey?: string,
            skipEntering?: boolean,
            skipExiting?: boolean,
            step?: number,
            total?: number,
            fullScreen?: boolean,
          ) =>
            React.cloneElement(child, {
              stepKey,
              skipEntering,
              skipExiting,
              step,
              total,
              fullScreen,
            }),
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

    return { outside, contents, footer, fullScreenSteps };
  }, [children]);

  useEffect(() => {
    registerTray(trayId, {
      contents: parsed.contents,
      footer: parsed.footer,
      fullScreenSteps: parsed.fullScreenSteps,
    });
  }, [
    trayId,
    parsed.contents,
    parsed.footer,
    parsed.fullScreenSteps,
    registerTray,
  ]);

  return (
    <TrayScopeContext.Provider value={trayId}>
      {parsed.outside}
      {/* No ActionTray here — provider renders all instances at root level */}
    </TrayScopeContext.Provider>
  );
};

TrayRoot.displayName = "TrayRoot";
