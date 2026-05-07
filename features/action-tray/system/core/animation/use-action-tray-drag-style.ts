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
