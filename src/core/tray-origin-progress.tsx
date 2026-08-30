import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayOriginProgressContext = createContext<SharedValue<number> | null>(
  null,
);

// provide trigger origin progress to chrome rendered outside the shell body
// provide trigger origin progress to chrome rendered outside the shell body
export const TrayOriginProgressProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SharedValue<number>;
}) => (
  <TrayOriginProgressContext.Provider value={value}>
    {children}
  </TrayOriginProgressContext.Provider>
);

// read the trigger expansion progress shared by the active tray
export const useTrayOriginProgress = () =>
  useContext(TrayOriginProgressContext);
