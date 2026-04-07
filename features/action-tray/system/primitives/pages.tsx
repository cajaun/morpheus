import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  PixelRatio,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SCREEN_WIDTH } from "../core/constants";
import { TrayPagesProvider } from "../pages-context";
import { TrayPage } from "./page";

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

const isElementOfType = <T,>(
  child: React.ReactNode,
  component: React.ComponentType<T>,
): child is React.ReactElement<T> =>
  React.isValidElement(child) && child.type === component;

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

const TrayPagesScene: React.FC<{
  children: React.ReactNode;
  index: number;
  pageIndex: number;
  pageWidth: number;
  progress: SharedValue<number>;
}> = ({ children, index, pageIndex, pageWidth, progress }) => {
  const offscreenOffset = pageWidth + 4;

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [index - 1, index, index + 1],
            [offscreenOffset, 0, -offscreenOffset],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }),
    [index, offscreenOffset, progress],
  );

  return (
    <Animated.View
      collapsable={false}
      pointerEvents={pageIndex === index ? "auto" : "none"}
      style={[styles.pageLayer, { width: pageWidth }, animatedStyle]}
    >
      <View style={styles.pageSlot}>{children}</View>
    </Animated.View>
  );
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
      if (isElementOfType(child, TrayPagesHeaderSlot)) {
        header = child.props.children;
        return;
      }

      if (isElementOfType(child, TrayPagesFooterSlot)) {
        footer = child.props.children;
        return;
      }

      if (isElementOfType(child, TrayPage)) {
        pages.push(child);
      }
    });

    return { header, footer, pages };
  }, [children]);

  const totalPages = parsed.pages.length;
  const resolvedInitialPage = clampPageIndex(initialPage, totalPages);
  const [pageIndex, setPageIndex] = useState(resolvedInitialPage);
  const [viewportWidthState, setViewportWidthState] = useState(SCREEN_WIDTH);
  const progress = useSharedValue(resolvedInitialPage);
  const pageWidth = viewportWidthState > 0 ? viewportWidthState : SCREEN_WIDTH;

  useEffect(() => {
    setPageIndex((currentIndex) => {
      const nextIndex = clampPageIndex(currentIndex, totalPages);

      if (nextIndex !== currentIndex) {
        progress.value = nextIndex;
      }

      return nextIndex;
    });
  }, [progress, totalPages]);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
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

      if (resolvedIndex === pageIndex) {
        return;
      }

      setPageIndex(resolvedIndex);
      progress.value = withSpring(
        resolvedIndex,
        PAGE_SPRING_CONFIG,
        (finished) => {
          if (finished) {
            progress.value = resolvedIndex;
          }
        },
      );
    },
    [pageIndex, progress, totalPages],
  );

  const nextPage = useCallback(() => {
    setPage(pageIndex + 1);
  }, [pageIndex, setPage]);

  const backPage = useCallback(() => {
    setPage(pageIndex - 1);
  }, [pageIndex, setPage]);

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
          {parsed.pages.map((page, index) => (
            <TrayPagesScene
              key={(page.key as string | null) ?? `tray-page-${index}`}
              index={index}
              pageIndex={pageIndex}
              pageWidth={pageWidth}
              progress={progress}
            >
              {page}
            </TrayPagesScene>
          ))}
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
  pageLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
});
