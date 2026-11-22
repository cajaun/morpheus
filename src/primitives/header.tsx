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

// header spacing lives here so tray surfaces share one visual grid
export const TrayHeader: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  withSeparator?: boolean;
}> = (props) => {
  const { children, style, className, withSeparator = false } = props;
  const parentTransition = useTrayHeaderTransition();
  const transitionValue = React.useMemo(
    () => ({
      stepKey: parentTransition?.stepKey ?? "",
      skipEntering: parentTransition?.skipEntering ?? false,
      fullScreenBoundaryExit:
        parentTransition?.fullScreenBoundaryExit ?? false,
    }),
    [
      parentTransition?.fullScreenBoundaryExit,
      parentTransition?.skipEntering,
      parentTransition?.stepKey,
    ],
  );

  return (
    <TrayHeaderTransitionProvider value={transitionValue}>
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

// the row positions controls and the library animates them, a left control centers the title and a right control leaves it in place
export const TrayHeaderRow: React.FC<{
  children: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, left, right, style, className }) => {
  const transition = useTrayHeaderTransition();

  if (!transition) {
    return (
      <View className={className} style={[styles.headerRow, style]}>
        <View
          pointerEvents="box-none"
          style={[
            styles.titleViewport,
            left != null && styles.titleViewportCentered,
          ]}
        >
          <View style={styles.titleLayer}>
            {children}
          </View>
        </View>
        <View pointerEvents={left != null ? "auto" : "none"} style={styles.leadingControlSlot}>
          {left}
        </View>
        <View pointerEvents={right != null ? "auto" : "none"} style={styles.trailingControlSlot}>
          {right}
        </View>
      </View>
    );
  }

  return (
    <HeaderTransitionRow
      className={className}
      style={style}
      transition={transition}
      left={left}
      right={right}
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
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const HeaderTransitionRow: React.FC<HeaderTransitionRowProps> = ({
  children,
  style,
  className,
  transition,
  left,
  right,
}) => {
  return (
    <TrayHeaderTransitionRow
      className={className}
      style={style}
      title={children}
      left={left}
      right={right}
      transition={transition}
    />
  );
};

// one positional control so every header shares the same hit target
export const TrayHeaderButton: React.FC<
  Omit<PressableProps, "children" | "style"> & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string;
  }
> = ({ children, style, className, ...props }) => (
  <Pressable
    {...props}
    className={className}
    style={[styles.headerButton, style]}
  >
    {children}
  </Pressable>
);

TrayHeaderButton.displayName = "TrayHeaderButton";

const styles = StyleSheet.create({
  headerRow: {
    height: TRAY_HEADER_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
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
  titleViewport: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
  },
  titleViewportCentered: {
    alignItems: "center",
  },
  titleLayer: {
    height: "100%",
    justifyContent: "center",
  },
  leadingControlSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    zIndex: 2,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  trailingControlSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
    zIndex: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});

TrayHeader.displayName = "TrayHeader";
