import React, { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

const TrayOriginProgressContext = createContext<SharedValue<number> | null>(
  null,
);

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

export const useTrayOriginProgress = () =>
  useContext(TrayOriginProgressContext);
