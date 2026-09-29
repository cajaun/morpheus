import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { TrayHeaderTransitionRow } from "../tray-step-content";
import { TraySeparator } from "./separator";
import {
  TrayHeaderTransitionProvider,
  useTrayHeaderTransition,
} from "./header-transition-context";
import {
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CONTENT_HEIGHT,
  TRAY_HEADER_PADDING_BOTTOM,
  TRAY_HEADER_PADDING_TOP,
} from "../core/constants";

// header spacing is centralized so tray surfaces share one visual grid
export const TrayHeader: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  withSeparator?: boolean;
  // Supplying this prop enables the optional centered-title/back-button
  // choreography. An undefined value keeps the title left-aligned.
  returnButton?: React.ReactNode;
}> = (props) => {
  const {
    children,
    style,
    className,
    withSeparator = false,
    returnButton,
  } = props;
  const parentTransition = useTrayHeaderTransition();

  return (
    <TrayHeaderTransitionProvider
      value={{
        stepKey: parentTransition?.stepKey ?? "",
        skipEntering: parentTransition?.skipEntering ?? false,
        fullScreenBoundaryExit:
          parentTransition?.fullScreenBoundaryExit ?? false,
        returnButton,
      }}
    >
      <View
        className={className}
        style={[
          styles.header,
          withSeparator && styles.headerWithSeparator,
          style,
        ]}
      >
        {children}
        {withSeparator ? <TraySeparator /> : null}
      </View>
    </TrayHeaderTransitionProvider>
  );
};

// HeaderRow uses the shared title participant for every tray header. Supplying
// returnButton only changes the optional control choreography and title
// centering; ordinary fixed headers still keep their title fade.
export const TrayHeaderRow: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className }) => {
  const transition = useTrayHeaderTransition();

  if (!transition) {
    return (
      <View className={className} style={[styles.headerRow, style]}>
        {children}
      </View>
    );
  }

  return (
    <HeaderTransitionRow
      className={className}
      style={style}
      transition={transition}
    >
      {children}
    </HeaderTransitionRow>
  );
};

type HeaderTransitionRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  transition: NonNullable<ReturnType<typeof useTrayHeaderTransition>>;
};

const HeaderTransitionRow: React.FC<HeaderTransitionRowProps> = ({
  children,
  style,
  className,
  transition,
}) => {
  const childrenArray = React.Children.toArray(children);
  let closeButtonIndex = -1;

  childrenArray.forEach((child, index) => {
    if (isTrayHeaderCloseButton(child)) {
      closeButtonIndex = index;
    }
  });
  const closeButton =
    closeButtonIndex >= 0 ? childrenArray[closeButtonIndex] : null;
  const titleChildren = childrenArray.filter(
    (_child, index) => index !== closeButtonIndex,
  );
  const titleNode =
    titleChildren.length === 1 ? titleChildren[0] : <>{titleChildren}</>;

  return (
    <TrayHeaderTransitionRow
      className={className}
      style={style}
      title={titleNode}
      closeButton={closeButton}
      returnButton={transition.returnButton}
      transition={transition}
    />
  );
};

const isTrayHeaderCloseButton = (child: React.ReactNode) => {
  if (!React.isValidElement(child)) {
    return false;
  }

  const childType = child.type as { displayName?: string };
  return (
    child.type === TrayHeaderCloseButton ||
    childType.displayName === "TrayHeaderCloseButton"
  );
};

// standardized close control so every tray header shares the same hit target
export const TrayHeaderCloseButton: React.FC<
  Omit<PressableProps, "children" | "style"> & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string;
  }
> = ({ children, style, className, ...props }) => (
  <Pressable
    {...props}
    className={className}
    style={[styles.closeButton, style]}
  >
    {children}
  </Pressable>
);

TrayHeaderCloseButton.displayName = "TrayHeaderCloseButton";

const styles = StyleSheet.create({
  headerRow: {
    height: TRAY_HEADER_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    height: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    borderRadius: TRAY_HEADER_CLOSE_BUTTON_SIZE / 2,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop: TRAY_HEADER_PADDING_TOP,
  },
  headerWithSeparator: {
    gap: TRAY_HEADER_PADDING_BOTTOM,
  },
});

TrayHeader.displayName = "TrayHeader";
