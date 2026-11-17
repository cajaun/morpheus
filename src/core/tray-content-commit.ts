import React from "react";

// Lets the content region tell the animated sheet that new step content has
// committed. The sheet answers by measuring that content synchronously inside
// the same commit (Fabric layout is already computed when layout effects run),
// so the target height reaches the UI thread in the same frame as the mount
// instead of one native onLayout round trip later.
export const TrayContentCommitContext = React.createContext<
  (() => void) | null
>(null);
