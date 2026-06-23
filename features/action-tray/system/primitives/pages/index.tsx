import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  PixelRatio,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SCREEN_WIDTH } from "../../core/constants";
import { TrayPagesProvider } from "../../pages-context";
import {
  useTrayHostSelector,
  useTrayScope,
  useTrayHost,
} from "../../runtime/tray-context";
import { TrayPage } from "../page";
import {
  clampPageIndex,
  isTrayPageInRenderWindow,
  PAGE_SPRING_CONFIG,
} from "./model";
import { TrayPagesScene } from "./scene";
import {
  isElementOfType,
  TrayPagesFooterSlot,
  TrayPagesHeaderSlot,
} from "./slots";

export { isTrayPageInRenderWindow } from "./model";

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
  // parse named children once so page order does not depend on prop position
  const parsed = useMemo(() => {
    const pages: React.ReactElement[] = [];
    let header: React.ReactNode = null;
    let footer: React.ReactNode = null;

    React.Children.forEach(children, (child) => {
      if (isElementOfType(child, TrayPagesHeaderSlot)) {
        // shell headers opt out because the parent tray already renders header chrome
        header = child.props.shell ? null : child.props.children;
        return;
      }

      if (isElementOfType(child, TrayPagesFooterSlot)) {
        footer = child;
        return;
      }

      if (isElementOfType(child, TrayPage)) {
        pages.push(child);
      }
    });

    return { header, footer, pages };
  }, [children]);

  const totalPages = parsed.pages.length;
  const trayId = useTrayScope();
  const activeIndex = useTrayHostSelector((state) => state.activeIndex);
  const activeStepKey = useTrayHostSelector((state) => {
    if (!trayId) {
      return null;
    }

    // page registration follows the active step key instead of global active index alone
    const stackEntry = state.stack.find((entry) => entry.trayId === trayId);
    const stepIndex = stackEntry?.index ?? state.activeIndex;

    return state.registry[trayId]?.steps[stepIndex]?.key ?? null;
  });
  const { registerTrayPages } = useTrayHost();
  const resolvedInitialPage = clampPageIndex(initialPage, totalPages);
  const [pageIndex, setPageIndex] = useState(resolvedInitialPage);
  const [transitionFromIndex, setTransitionFromIndex] = useState<
    number | null
  >(null);
  const [viewportWidthState, setViewportWidthState] = useState(SCREEN_WIDTH);
  const progress = useSharedValue(resolvedInitialPage);
  const transitionTargetRef = useRef<number | null>(null);
  const startedTransitionTargetRef = useRef<number | null>(null);
  const pageWidth = viewportWidthState > 0 ? viewportWidthState : SCREEN_WIDTH;

  useEffect(() => {
    // clamp after children change so removed pages cannot leave a stale index
    const nextIndex = clampPageIndex(pageIndex, totalPages);

    if (nextIndex === pageIndex) {
      return;
    }

    transitionTargetRef.current = null;
    startedTransitionTargetRef.current = null;
    setTransitionFromIndex(null);
    setPageIndex(nextIndex);
    progress.value = nextIndex;
  }, [pageIndex, progress, totalPages]);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // measure the rendered tray because sheets and fullscreen use different widths
      const nextWidth = PixelRatio.roundToNearestPixel(
        event.nativeEvent.layout.width || SCREEN_WIDTH,
      );

      if (Math.abs(nextWidth - viewportWidthState) < 0.5) {
        return;
      }

      setViewportWidthState(nextWidth);
    },
    [viewportWidthState],
  );

  const setPage = useCallback(
    (nextIndex: number) => {
      const resolvedIndex = clampPageIndex(nextIndex, totalPages);

      if (
        resolvedIndex === pageIndex ||
        transitionFromIndex !== null
      ) {
        // one page transition at a time keeps outgoing and incoming windows bounded
        return;
      }

      // keep the outgoing page mounted until the spring reports completion
      transitionTargetRef.current = resolvedIndex;
      setTransitionFromIndex(pageIndex);
      setPageIndex(resolvedIndex);
    },
    [pageIndex, totalPages, transitionFromIndex],
  );

  const handlePageTransitionComplete = useCallback((targetIndex: number) => {
    if (transitionTargetRef.current !== targetIndex) {
      // stale spring callbacks cannot clear a newer transition window
      return;
    }

    transitionTargetRef.current = null;
    startedTransitionTargetRef.current = null;
    setTransitionFromIndex(null);
  }, []);

  useLayoutEffect(() => {
    if (
      transitionFromIndex === null ||
      transitionTargetRef.current !== pageIndex ||
      startedTransitionTargetRef.current === pageIndex
    ) {
      return;
    }

    // start after the target page commits so idle pages can stay unmounted
    startedTransitionTargetRef.current = pageIndex;
    progress.value = withSpring(
      pageIndex,
      PAGE_SPRING_CONFIG,
      (finished) => {
        if (finished) {
          progress.value = pageIndex;
          scheduleOnRN(handlePageTransitionComplete, pageIndex);
        }
      },
    );
  }, [
    handlePageTransitionComplete,
    pageIndex,
    progress,
    transitionFromIndex,
  ]);

  const nextPage = useCallback(() => {
    setPage(pageIndex + 1);
  }, [pageIndex, setPage]);

  const backPage = useCallback(() => {
    setPage(pageIndex - 1);
  }, [pageIndex, setPage]);

  useEffect(() => {
    if (!trayId || !activeStepKey) {
      return;
    }

    registerTrayPages(trayId, {
      stepKey: activeStepKey,
      pageIndex,
      totalPages,
      // footer pages keep controls local instead of delegating flow next back
      hasFooter: parsed.footer != null,
      canGoNext: pageIndex < totalPages - 1,
      canGoBack: pageIndex > 0,
      nextPage,
      backPage,
      setPage,
      progress,
    });

    return () => {
      registerTrayPages(trayId, null);
    };
  }, [
    activeIndex,
    activeStepKey,
    backPage,
    nextPage,
    pageIndex,
    parsed.footer,
    progress,
    registerTrayPages,
    setPage,
    totalPages,
    trayId,
  ]);

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
          {parsed.pages.map((page, index) => {
            if (
              !isTrayPageInRenderWindow(
                index,
                pageIndex,
                transitionFromIndex,
              )
            ) {
              // idle pager keeps offscreen pages unmounted to avoid hidden layout work
              return null;
            }

            return (
              <TrayPagesScene
                key={(page.key as string | null) ?? `tray-page-${index}`}
                index={index}
                pageIndex={pageIndex}
                pageWidth={pageWidth}
                progress={progress}
              >
                {page}
              </TrayPagesScene>
            );
          })}
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
});
