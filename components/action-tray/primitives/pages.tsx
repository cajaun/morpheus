import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  EntryExitAnimationFunction,
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SCREEN_WIDTH } from "../core/constants";
import { TrayPagesProvider } from "../pages-context";

type TrayPagesDirection = -1 | 0 | 1;

const PAGE_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
} as const;

const createPageEntering = (
  direction: { value: TrayPagesDirection },
  slideActive: { value: boolean },
  onComplete?: () => void,
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    if (!slideActive.value) {
      return {
        initialValues: {
          opacity: 1,
          transform: [{ translateX: 0 }],
        },
        animations: {
          opacity: withTiming(1, { duration: 0 }),
          transform: [{ translateX: withTiming(0, { duration: 0 }) }],
        },
      };
    }

    const resolvedDirection = direction.value === -1 ? -1 : 1;

    return {
      initialValues: {
        transform: [
          {
            translateX:
              resolvedDirection === 1 ? SCREEN_WIDTH : -SCREEN_WIDTH,
          },
        ],
      },
      animations: {
        transform: [
          {
            translateX: withSpring(0, PAGE_SPRING_CONFIG, (finished) => {
              if (finished && onComplete) {
                runOnJS(onComplete)();
              }
            }),
          },
        ],
      },
    };
  };
};

const createPageExiting = (
  direction: { value: TrayPagesDirection },
  slideActive: { value: boolean },
): EntryExitAnimationFunction => {
  return () => {
    "worklet";

    if (!slideActive.value) {
      return {
        initialValues: {
          opacity: 1,
          transform: [{ translateX: 0 }],
        },
        animations: {
          opacity: withTiming(1, { duration: 0 }),
          transform: [{ translateX: withTiming(0, { duration: 0 }) }],
        },
      };
    }

    const resolvedDirection = direction.value === -1 ? -1 : 1;

    return {
      initialValues: {
        transform: [{ translateX: 0 }],
      },
      animations: {
        transform: [
          {
            translateX: withSpring(
              resolvedDirection === 1 ? -SCREEN_WIDTH : SCREEN_WIDTH,
              PAGE_SPRING_CONFIG,
            ),
          },
        ],
      },
    };
  };
};

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
  const [hasMounted, setHasMounted] = useState(false);
  const [pageTransitionActive, setPageTransitionActive] = useState(false);
  const [pendingPageIndex, setPendingPageIndex] = useState<number | null>(null);
  const pageIndexRef = useRef(resolvedInitialPage);
  const progress = useSharedValue(resolvedInitialPage);
  const direction = useSharedValue<TrayPagesDirection>(0);
  const slideActiveShared = useSharedValue(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const nextIndex = clampPageIndex(pageIndexRef.current, totalPages);
    pageIndexRef.current = nextIndex;
    setPageIndex(nextIndex);
    setPendingPageIndex(null);
    setPageTransitionActive(false);
    progress.value = nextIndex;
    direction.value = 0;
    slideActiveShared.value = false;
  }, [direction, progress, slideActiveShared, totalPages]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
    progress.value = withTiming(pageIndex, { duration: 220 });
  }, [pageIndex, progress]);

  useEffect(() => {
    if (pendingPageIndex == null || !pageTransitionActive) {
      return;
    }

    setPageIndex(pendingPageIndex);
    setPendingPageIndex(null);
  }, [pageTransitionActive, pendingPageIndex]);

  const finishPageTransition = useCallback(() => {
    slideActiveShared.value = false;
    setPageTransitionActive(false);
  }, [slideActiveShared]);

  const setPage = useCallback(
    (nextIndex: number) => {
      const currentIndex = pageIndexRef.current;
      const resolvedIndex = clampPageIndex(nextIndex, totalPages);

      if (resolvedIndex === currentIndex) {
        return;
      }

      direction.value = resolvedIndex > currentIndex ? 1 : -1;
      slideActiveShared.value = true;
      setPageTransitionActive(true);
      setPendingPageIndex(resolvedIndex);
    },
    [direction, slideActiveShared, totalPages],
  );

  const nextPage = useCallback(() => {
    setPage(pageIndexRef.current + 1);
  }, [setPage]);

  const backPage = useCallback(() => {
    setPage(pageIndexRef.current - 1);
  }, [setPage]);

  const activePage = parsed.pages[pageIndex] ?? null;
  const activePageKey =
    activePage?.key != null ? String(activePage.key) : `tray-page-${pageIndex}`;

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

        <View style={styles.viewport}>
          {activePage ? (
            <Animated.View
              key={activePageKey}
              collapsable={false}
              entering={
                hasMounted && pageTransitionActive
                  ? createPageEntering(
                      direction,
                      slideActiveShared,
                      finishPageTransition,
                    )
                  : undefined
              }
              exiting={
                hasMounted && pageTransitionActive
                  ? createPageExiting(direction, slideActiveShared)
                  : undefined
              }
              style={styles.pageSlot}
            >
              {activePage}
            </Animated.View>
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
  },
  pageSlot: {
    flex: 1,
  },
});
