import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SCREEN_WIDTH } from "../core/constants";
import { TrayPagesProvider } from "../pages-context";

type TrayPagesDirection = -1 | 0 | 1;

type TransitionState = {
  key: number;
  fromIndex: number;
  toIndex: number;
  direction: TrayPagesDirection;
};

const PAGE_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
} as const;

const TrayPagesHeaderSlot: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

TrayPagesHeaderSlot.displayName = "TrayPagesHeader";

const TrayPagesFooterSlot: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

TrayPagesFooterSlot.displayName = "TrayPagesFooter";

const clampPageIndex = (index: number, totalPages: number) => {
  if (totalPages <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, totalPages - 1));
};

const clonePage = (page: React.ReactElement, key: string) =>
  React.cloneElement(page, { key });

type TrayPagesProps = {
  children: React.ReactNode;
  initialPage?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const TrayPagesRoot: React.FC<TrayPagesProps> = ({
  children,
  initialPage = 0,
  style,
  className,
}) => {
  const parsed = useMemo(() => {
    const pages: React.ReactElement[] = [];
    let header: React.ReactNode = null;
    let footer: React.ReactNode = null;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const name = (child.type as any)?.displayName;

      if (name === "TrayPagesHeader") {
        header = child.props.children;
        return;
      }

      if (name === "TrayPagesFooter") {
        footer = child.props.children;
        return;
      }

      if (name === "TrayPage") {
        pages.push(child);
      }
    });

    return { header, footer, pages };
  }, [children]);

  const totalPages = parsed.pages.length;
  const resolvedInitialPage = clampPageIndex(initialPage, totalPages);
  const [pageIndex, setPageIndex] = useState(resolvedInitialPage);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const [viewportWidthState, setViewportWidthState] = useState(SCREEN_WIDTH);
  const pageIndexRef = useRef(resolvedInitialPage);
  const transitionKeyRef = useRef(0);
  const viewportWidthRef = useRef(SCREEN_WIDTH);
  const rowTranslateX = useSharedValue(0);
  const progress = useSharedValue(resolvedInitialPage);
  const pageWidth = Math.max(viewportWidthState, SCREEN_WIDTH);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rowTranslateX.value }],
  }));

  useEffect(() => {
    const nextIndex = clampPageIndex(pageIndexRef.current, totalPages);
    pageIndexRef.current = nextIndex;
    setPageIndex(nextIndex);
    setTransition(null);
    progress.value = nextIndex;
    rowTranslateX.value = 0;
  }, [progress, rowTranslateX, totalPages]);

  const finishTransition = useCallback(
    (transitionKey: number) => {
      setTransition((current) => {
        if (!current || current.key !== transitionKey) {
          return current;
        }

        return null;
      });
    },
    [],
  );

  useEffect(() => {
    if (transition === null) {
      rowTranslateX.value = 0;
    }
  }, [rowTranslateX, transition]);

  useEffect(() => {
    if (!transition) {
      return;
    }

    const width = Math.max(viewportWidthRef.current || SCREEN_WIDTH, SCREEN_WIDTH);
    const targetTranslateX = transition.direction === 1 ? -width : 0;

    rowTranslateX.value = withSpring(
      targetTranslateX,
      PAGE_SPRING_CONFIG,
      (finished) => {
        if (finished) {
          runOnJS(finishTransition)(transition.key);
        }
      },
    );
  }, [finishTransition, rowTranslateX, transition]);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width || SCREEN_WIDTH;

      if (Math.abs(nextWidth - viewportWidthRef.current) < 0.5) {
        return;
      }

      viewportWidthRef.current = nextWidth;
      setViewportWidthState(nextWidth);

      if (!transition) {
        rowTranslateX.value = 0;
      }
    },
    [rowTranslateX, transition],
  );

  const setPage = useCallback(
    (nextIndex: number) => {
      if (transition !== null) {
        return;
      }

      const currentIndex = pageIndexRef.current;
      const resolvedIndex = clampPageIndex(nextIndex, totalPages);

      if (resolvedIndex === currentIndex) {
        return;
      }

      const direction: TrayPagesDirection =
        resolvedIndex > currentIndex ? 1 : -1;
      const width = Math.max(
        viewportWidthRef.current || SCREEN_WIDTH,
        SCREEN_WIDTH,
      );
      const nextTransitionKey = transitionKeyRef.current + 1;

      transitionKeyRef.current = nextTransitionKey;
      rowTranslateX.value = direction === 1 ? 0 : -width;
      pageIndexRef.current = resolvedIndex;
      setPageIndex(resolvedIndex);
      setTransition({
        key: nextTransitionKey,
        fromIndex: currentIndex,
        toIndex: resolvedIndex,
        direction,
      });
      progress.value = withTiming(resolvedIndex, { duration: 220 });
    },
    [progress, rowTranslateX, totalPages, transition],
  );

  const nextPage = useCallback(() => {
    setPage(pageIndexRef.current + 1);
  }, [setPage]);

  const backPage = useCallback(() => {
    setPage(pageIndexRef.current - 1);
  }, [setPage]);

  const activePage = parsed.pages[pageIndex] ?? null;
  const transitionPages = useMemo(() => {
    if (!transition) {
      return null;
    }

    const fromPage = parsed.pages[transition.fromIndex] ?? null;
    const toPage = parsed.pages[transition.toIndex] ?? null;

    if (!fromPage || !toPage) {
      return null;
    }

    if (transition.direction === 1) {
      return {
        left: clonePage(
          fromPage,
          `tray-page-from-${transition.key}-${transition.fromIndex}`,
        ),
        right: clonePage(
          toPage,
          `tray-page-to-${transition.key}-${transition.toIndex}`,
        ),
      };
    }

    return {
      left: clonePage(
        toPage,
        `tray-page-to-${transition.key}-${transition.toIndex}`,
      ),
      right: clonePage(
        fromPage,
        `tray-page-from-${transition.key}-${transition.fromIndex}`,
      ),
    };
  }, [parsed.pages, transition]);

  return (
    <TrayPagesProvider
      value={{
        pageIndex,
        totalPages,
        canGoNext: pageIndex < totalPages - 1,
        canGoBack: pageIndex > 0,
        nextPage,
        backPage,
        setPage,
        progress,
      }}
    >
      <View className={className} style={[styles.root, style]}>
        {parsed.header}

        <View style={styles.viewport} onLayout={handleViewportLayout}>
          {transition && transitionPages ? (
            <Animated.View
              collapsable={false}
              pointerEvents="none"
              style={[
                styles.row,
                rowStyle,
                { width: pageWidth * 2 },
              ]}
            >
              <View style={[styles.pageCell, { width: pageWidth }]}>
                {transitionPages.left}
              </View>

              <View style={[styles.pageCell, { width: pageWidth }]}>
                {transitionPages.right}
              </View>
            </Animated.View>
          ) : activePage ? (
            <View key={`tray-page-static-${pageIndex}`} style={styles.pageSlot}>
              {activePage}
            </View>
          ) : null}
        </View>

        {parsed.footer}
      </View>
    </TrayPagesProvider>
  );
};

TrayPagesRoot.displayName = "TrayPages";

export const TrayPages = Object.assign(TrayPagesRoot, {
  Header: TrayPagesHeaderSlot,
  Footer: TrayPagesFooterSlot,
});

const styles = StyleSheet.create({
  root: {
    height: "100%",
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  pageSlot: {
    flex: 1,
    width: "100%",
  },
  row: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    flexDirection: "row",
  },
  pageCell: {
    flexShrink: 0,
    height: "100%",
  },
});
