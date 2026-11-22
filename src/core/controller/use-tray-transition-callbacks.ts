import { useLayoutTransitionComplete } from "./use-layout-transition-complete";
import { useLayoutTransitionStartCallbacks } from "./use-layout-transition-start-callbacks";
import type { TransitionCallbackParams } from "./transition-callback-params";

// layout callbacks own lifecycle marks and release the temporary sheet frame lease
export const useTrayTransitionCallbacks = (
  params: TransitionCallbackParams,
) => {
  const { handleLayoutTransitionConfigured, handleLayoutTransitionStart } =
    useLayoutTransitionStartCallbacks(params);
  const handleLayoutTransitionComplete = useLayoutTransitionComplete(params);

  return {
    handleLayoutTransitionConfigured,
    handleLayoutTransitionStart,
    handleLayoutTransitionComplete,
  };
};
