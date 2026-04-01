import React, {
  useCallback,
  useMemo,
  forwardRef,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  StyleProp,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Backdrop } from "./backdrop";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  MORPH_DURATION,
  SCREEN_HEIGHT,
  TRAY_VERTICAL_PADDING,
} from "./constants";

type ActionTrayProps = {
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
};

export type ActionTrayRef = {
  open: () => void;
  close: () => void;
  isActive: () => boolean;
};

const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log("[ActionTray]", ...args);
};

const ActionTray = forwardRef<ActionTrayRef, ActionTrayProps>(
  ({ style, onClose, content, footer, trayId, visible }, ref) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const contentHeight = useSharedValue(0);
    const footerHeight = useSharedValue(0);
    const active = useSharedValue(false);
    const context = useSharedValue({ y: 0 });

    // ReactNodes can't be passed into worklets
    //  useSharedValue gives the animated style a boolean 
    // so it can safely read on the UI thread
    const hasFooter = useSharedValue(false);

    const [layoutEnabled, setLayoutEnabled] = useState(false);
    const [footerMeasured, setFooterMeasured] = useState(false);
    const [contentMeasured, setContentMeasured] = useState(false);
    const [pendingOpen, setPendingOpen] = useState(false);

    const measuredFooterHeightRef = useRef(0);
    const justOpenedRef = useRef(false);

    // A plain number incremented on every open/close transition.
    // Spring callbacks capture it as a primitive (safe for worklets
    // and JS reads the ref live to detect stale callbacks.
    const closeGenerationRef = useRef(0);

    const { bottom } = useSafeAreaInsets();

    const [renderedFooter, setRenderedFooter] =
      useState<React.ReactNode>(footer);
    const [renderedContent, setRenderedContent] =
      useState<React.ReactNode>(content);
    const [renderedTrayId, setRenderedTrayId] = useState<string | undefined>(
      trayId,
    );

    useEffect(() => {
      hasFooter.value = !!renderedFooter;
    }, [renderedFooter]);


    const doOpenSpring = useCallback(() => {
      log("doOpenSpring", {
        footer: measuredFooterHeightRef.current,
        content: contentHeight.value,
      });

      footerHeight.value = measuredFooterHeightRef.current;

      translateY.value = withSpring(
        0,
        { damping: 50, stiffness: 400, mass: 0.8 },
        (finished) => {
          if (finished) {
            runOnJS(log)("OPEN SPRING FINISHED");
            runOnJS(setLayoutEnabled)(true);
          }
        },
      );

      active.value = true;
    }, []);



    // Also zeroes contentHeight and clears contentMeasured so the next open
    // can't inherit a stale layout reading from the wiped container.
    const resetContent = useCallback(() => {
      log("resetContent()");
      contentHeight.value = 0;
      setContentMeasured(false);
      setRenderedContent(null);
      setRenderedFooter(null);
      setRenderedTrayId(undefined);
      setLayoutEnabled(false);
    }, []);



    // Spring callbacks run on the UI thread. Reading a ref there would be
    // unsafe, so we bridge back via runOnJS and compare on the JS thread.
    const checkAndReset = useCallback(
      (capturedGeneration: number) => {
        if (closeGenerationRef.current === capturedGeneration) {
          log("CLOSE SPRING FINISHED — resetting content");
          resetContent();
        } else {
          log(
            "CLOSE SPRING — stale, skipping resetContent",
            capturedGeneration,
            closeGenerationRef.current,
          );
        }
      },
      [resetContent],
    );


    useEffect(() => {
      if (visible) {
        // Bumping before the close spring finishes makes any in-flight callback
        // stale so it won't wipe content that belongs to the new tray.
        closeGenerationRef.current++;
        justOpenedRef.current = true;

        log("OPEN START", {
          trayId,
          footerMeasured,
          contentMeasured,
          footer: measuredFooterHeightRef.current,
        });

        setRenderedTrayId(trayId);
        setRenderedContent(content);
        setRenderedFooter(footer);
        setLayoutEnabled(false);
        setContentMeasured(false);

        if (!footerMeasured || !contentMeasured) {
          log("OPEN — waiting for measurement", {
            footerMeasured,
            contentMeasured,
          });
          setPendingOpen(true);
        } else {
          doOpenSpring();
        }
      } else {
        log("CLOSE START");

        // Capture as a local primitive before the worklet is created so the
        // closure holds an immutable snapshot, not a mutable ref object.
        const myGeneration = ++closeGenerationRef.current;

        setPendingOpen(false);
        setLayoutEnabled(false);
        active.value = false;

        translateY.value = withSpring(
          SCREEN_HEIGHT,
          { damping: 50, stiffness: 400, mass: 0.8 },
          () => {
            runOnJS(checkAndReset)(myGeneration);
          },
        );
      }
    }, [visible]);



    // Footer height must be measured before opening so the tray doesn't
    // pop to the wrong size. Content measurement gates the spring the same way.
    useEffect(() => {
      if (!pendingOpen || !footerMeasured || !contentMeasured) return;

      log("PENDING OPEN — all measurements ready", {
        footer: measuredFooterHeightRef.current,
        content: contentHeight.value,
      });

      setPendingOpen(false);
      doOpenSpring();
    }, [pendingOpen, footerMeasured, contentMeasured]);



    // trayId encodes both which tray and which step, so any change here
    // means the visible content needs to swap without a close/open cycle.
    useEffect(() => {
      if (!visible) return;

      // Skip the first render after open 
      // since the content was already set in the
      // visible effect above and we don't want to double-apply it.
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }

      log("STEP CHANGE", { trayId });

      setLayoutEnabled(true);
      setRenderedContent(content);
      setRenderedFooter(footer);
      setRenderedTrayId(trayId);
    }, [trayId]);


    const totalHeight = useDerivedValue(() => {
      return contentHeight.value + footerHeight.value + bottom;
    });

    const progress = useDerivedValue(() => {
      return 1 - translateY.value / SCREEN_HEIGHT;
    });

    const heightEasing = Easing.bezier(0.26, 1, 0.5, 1).factory();

    const layoutAnimationConfig = useMemo(
      () => LinearTransition.duration(MORPH_DURATION).easing(heightEasing),
      [],
    );


    const scrollTo = useCallback((destination: number) => {
      "worklet";
      active.value = destination !== SCREEN_HEIGHT;
      translateY.value = withSpring(destination, {
        damping: 50,
        stiffness: 400,
        mass: 0.8,
      });
    }, []);

    const handleClose = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const gesture = useMemo(() => {
      return Gesture.Pan()
        .onStart(() => {
          context.value = { y: translateY.value };
        })
        .onUpdate((e) => {
          if (e.translationY >= 0) {
            translateY.value = e.translationY + context.value.y;
          }
        })
        .onEnd((e) => {
          const projectedEnd = translateY.value + e.velocityY / 60;
          const shouldClose =
            projectedEnd > totalHeight.value * 0.5 || e.velocityY > 1000;

          if (shouldClose) {
            runOnJS(handleClose)();
          } else {
            scrollTo(0);
          }
        });
    }, [handleClose, scrollTo]);


    const rFooterSpacerStyle = useAnimatedStyle(() => ({
      height: hasFooter.value ? footerHeight.value : 0,
    }));

    const rDragStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));



    // Guard against stale layout events fired after resetContent nulls the tray.
    // Without the renderedTrayId check, the empty container reports a height
    // equal to the footer spacer and poisons contentMeasured for the next open.
    const handleLayout = (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      contentHeight.value = h;

      if (!contentMeasured && renderedTrayId !== undefined) {
        setContentMeasured(true);
      }

      log("CONTENT onLayout", { height: h, trayId: renderedTrayId });
    };

    const handleFooterLayout = (e: LayoutChangeEvent) => {
      if (!renderedFooter) return;

      const h = e.nativeEvent.layout.height;

      log("VISIBLE FOOTER onLayout", {
        height: h,
        measuredRef: measuredFooterHeightRef.current,
        delta: h - measuredFooterHeightRef.current,
      });

      footerHeight.value = h;
    };


    return (
      <>
        {/* Render footer offscreen before the tray opens so its height is known
            before the spring fires. Unmounts once measured. */}
        {footer && !footerMeasured && (
          <Animated.View
            style={[
              styles.measureFooter,
              {
                left: HORIZONTAL_MARGIN,
                right: HORIZONTAL_MARGIN,
                paddingHorizontal: TRAY_VERTICAL_PADDING,
                paddingTop: 6,
                paddingBottom: TRAY_VERTICAL_PADDING,
              },
            ]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;

              log("OFFSCREEN FOOTER onLayout", { height: h });

              measuredFooterHeightRef.current = h;
              footerHeight.value = h;
              setFooterMeasured(true);
            }}
            pointerEvents="none"
          >
            {footer}
          </Animated.View>
        )}

        <Backdrop onTap={handleClose} isActive={active} progress={progress} />

        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[styles.container, { bottom }, rDragStyle, style]}
            layout={layoutEnabled ? layoutAnimationConfig : undefined}
            onLayout={handleLayout}
          >
            <Animated.View style={styles.content}>
              {renderedContent}
              <Animated.View style={rFooterSpacerStyle} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Footer is absolutely positioned over the tray bottom and slides with it.
            Opacity hides it when empty; pointer events are disabled to match. */}
        <Animated.View
          onLayout={handleFooterLayout}
          style={[
            styles.footer,
            { bottom, left: HORIZONTAL_MARGIN, right: HORIZONTAL_MARGIN },
            rDragStyle,
            { opacity: renderedFooter ? 1 : 0 },
          ]}
          pointerEvents={renderedFooter ? "auto" : "none"}
        >
          {renderedFooter ?? null}
        </Animated.View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: HORIZONTAL_MARGIN,
    right: HORIZONTAL_MARGIN,
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  content: {
    padding: 0,
  },
  footer: {
    position: "absolute",
    paddingHorizontal: TRAY_VERTICAL_PADDING,
    paddingTop: 6,
    paddingBottom: TRAY_VERTICAL_PADDING,
    backgroundColor: "white",
    borderBottomLeftRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  measureFooter: {
    position: "absolute",
    opacity: 0,
    top: -10000,
  },
});

ActionTray.displayName = "ActionTray";

export { ActionTray };