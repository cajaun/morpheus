import { useAnimatedStyle } from "react-native-reanimated";
import type {
  ActionTrayAnimatedStyleParams,
  ActionTrayAnimationState,
} from "./action-tray-animated-style-types";

type Params = Pick<ActionTrayAnimatedStyleParams, "translateY"> &
  Pick<
    ActionTrayAnimationState,
    "originProgress" | "shouldUseOriginTransition"
  >;

// apply drag travel after origin progress so trigger expansion stays anchored
export const useActionTrayDragStyle = ({
  originProgress,
  shouldUseOriginTransition,
  translateY,
}: Params) =>
  useAnimatedStyle(() => {
    if (shouldUseOriginTransition) {
      return {
        transform: [
          {
            // trigger-origin progress stays local to the shell's existing drag transform
            translateY: translateY.value * originProgress.value,
          },
        ],
      };
    }

    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  }, [originProgress, shouldUseOriginTransition]);
