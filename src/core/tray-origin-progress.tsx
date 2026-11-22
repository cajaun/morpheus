import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayOriginProgressContext = createContext<SharedValue<number> | null>(
  null,
);

// trigger origin progress for chrome rendered outside the shell body
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

// trigger expansion progress shared by the active tray
export const useTrayOriginProgress = () =>
  useContext(TrayOriginProgressContext);
