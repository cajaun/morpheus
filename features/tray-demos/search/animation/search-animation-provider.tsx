import {
  createContext,
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useContext,
  useRef,
} from "react";
import { Dimensions, TextInput } from "react-native";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

export const SEARCHBAR_HEIGHT = 40;
export const EDIT_HOME_CONTAINER_WIDTH = 52;
export const SETTINGS_CONTAINER_WIDTH = 52;
export const CANCEL_CONTAINER_WIDTH = 78;
const HORIZONTAL_PADDING = 24;

export const SEARCHBAR_OVERVIEW_WIDTH =
  Dimensions.get("window").width -
  HORIZONTAL_PADDING * 2 -
  EDIT_HOME_CONTAINER_WIDTH -
  SETTINGS_CONTAINER_WIDTH;
export const SEARCHBAR_RESULTS_WIDTH =
  Dimensions.get("window").width -
  HORIZONTAL_PADDING * 2 -
  CANCEL_CONTAINER_WIDTH;

export const TRIGGER_DRAG_DISTANCE = -100;
export const FULL_DRAG_DISTANCE = -200;

type ScreenView = "overview" | "results";

type SearchAnimationContextValue = {
  blurIntensity: SharedValue<number>;
  inputRef: RefObject<TextInput | null>;
  isListDragging: SharedValue<boolean>;
  offsetY: SharedValue<number>;
  onOpenResults: () => void;
  onCloseResults: () => void;
  screenView: SharedValue<ScreenView>;
};

const SearchAnimationContext =
  createContext<SearchAnimationContextValue>({} as SearchAnimationContextValue);

export const SearchAnimationProvider = ({ children }: PropsWithChildren) => {
  const inputRef = useRef<TextInput>(null);
  const screenView = useSharedValue<ScreenView>("overview");
  const offsetY = useSharedValue(0);
  const isListDragging = useSharedValue(false);
  const blurIntensity = useSharedValue(0);

  const onOpenResults = useCallback(() => {
    screenView.value = "results";
    blurIntensity.value = withTiming(100);
    inputRef.current?.focus();
  }, [blurIntensity, inputRef, screenView]);

  const onCloseResults = useCallback(() => {
    screenView.value = "overview";
    blurIntensity.value = withTiming(0);
    inputRef.current?.blur();
  }, [blurIntensity, inputRef, screenView]);

  return (
    <SearchAnimationContext.Provider
      value={{
        blurIntensity,
        inputRef,
        isListDragging,
        offsetY,
        onOpenResults,
        onCloseResults,
        screenView,
      }}
    >
      {children}
    </SearchAnimationContext.Provider>
  );
};

export const useSearchAnimation = () => {
  const context = useContext(SearchAnimationContext);

  if (!context) {
    throw new Error(
      "useSearchAnimation must be used within SearchAnimationProvider",
    );
  }

  return context;
};
