import { useAnimatedStyle } from "react-native-reanimated";
import type {
  TrayAnimatedStyleParams,
  TrayAnimationState,
} from "./tray-animated-style-types";

type Params = Pick<TrayAnimatedStyleParams, "translateY"> &
  Pick<
    TrayAnimationState,
    "originProgress" | "shouldUseOriginTransition"
  >;

// drag travel applies after origin progress so trigger expansion stays anchored
export const useTrayDragStyle = ({
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
