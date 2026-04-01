import React, { useEffect } from "react";

export const TrayFooter: React.FC<{
  children: React.ReactNode;
  step?: number;
  total?: number;
}> = ({ children, step, total }) => {

  useEffect(() => {
  console.log("[TrayFooter] props", {
    step,
    total,
  });
}, [step, total]);

  return React.cloneElement(children as any, { step, total });
};

TrayFooter.displayName = "TrayFooter";