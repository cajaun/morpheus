import { useSafeAreaInsets } from "react-native-safe-area-context";

export const useSearchHeaderHeight = () => {
  const { top } = useSafeAreaInsets();
  const netHeight = 72;
  const grossHeight = top + netHeight;

  return {
    grossHeight,
    insetTop: top,
    netHeight,
  };
};
