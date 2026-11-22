import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { TrayPagesProvider } from "../../pages-context";
import {
  useTrayHostActions,
  useTrayHostSelector,
  useTrayRuntimeStore,
  useTrayScope,
  useTrayStepLayer,
} from "../../runtime/tray-context";
import {
  isTrayPageInRenderWindow,
  parseTrayPagesChildren,
} from "./model";
import { TrayPagesScene } from "./scene";
import { TrayPagesFooterSlot, TrayPagesHeaderSlot } from "./slots";
import { useTrayPagesRegistration } from "./use-tray-pages-registration";
import { useTrayPagesTransition } from "./use-tray-pages-transition";

export { isTrayPageInRenderWindow } from "./model";

type TrayPagesProps = {
  children: React.ReactNode;
  initialPage?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

// page parsing, registration and animated page rendering
const TrayPagesRoot: React.FC<TrayPagesProps> = ({
  children,
  initialPage = 0,
  style,
  className,
}) => {
  const parsed = useMemo(() => parseTrayPagesChildren(children), [children]);
  const totalPages = parsed.pages.length;
  const trayId = useTrayScope();
  const stepLayer = useTrayStepLayer();
  // pages in a preloading tray belong to their layer's step, so a hidden step skips re-rendering on every step change
  const layerStepKey =
    trayId && stepLayer?.startsWith(`${trayId}-`)
      ? stepLayer.slice(trayId.length + 1)
      : null;
  const activeStepKey = useTrayHostSelector((state) => {
    if (layerStepKey !== null) {
      return layerStepKey;
    }

    if (!trayId) {
      return null;
    }

    // page registration follows the active step key instead of the global index
    const stackEntry = state.stack.find((entry) => entry.trayId === trayId);
    const stepIndex = stackEntry?.index ?? state.activeIndex;

    return state.registry[trayId]?.steps[stepIndex]?.key ?? null;
  });
  // pages read the imperative runtime commands, a full snapshot subscription would re-render the pages subtree on every shell write
  const { registerTrayPages, requestPageTransition } = useTrayHostActions();
  const runtime = useTrayRuntimeStore();
  const pager = useTrayPagesTransition({
    initialPage,
    totalPages,
    trayId,
    activeStepKey,
    requestPageTransition,
    transitions: runtime.transitions,
  });

  useTrayPagesRegistration({
    activeStepKey,
    backPage: pager.backPage,
    hasFooter: parsed.footer != null,
    nextPage: pager.nextPage,
    pageIndex: pager.pageIndex,
    progress: pager.progress,
    registerTrayPages,
    setPage: pager.setPage,
    totalPages,
    trayId,
  });

  return (
    <TrayPagesProvider
      value={{
        pageIndex: pager.pageIndex,
        totalPages,
        canGoNext: pager.pageIndex < totalPages - 1,
        canGoBack: pager.pageIndex > 0,
        nextPage: pager.nextPage,
        backPage: pager.backPage,
        setPage: pager.setPage,
        progress: pager.progress,
      }}
    >
      <View className={className} style={[styles.root, style]}>
        {parsed.header}

        <View style={styles.viewport} onLayout={pager.handleViewportLayout}>
          {parsed.pages.map((page, index) => {
            if (
              !isTrayPageInRenderWindow(
                index,
                pager.pageIndex,
                pager.transitionFromIndex,
              )
            ) {
              return null;
            }

            return (
              <TrayPagesScene
                key={(page.key as string | null) ?? `tray-page-${index}`}
                index={index}
                pageIndex={pager.pageIndex}
                viewportWidth={pager.viewportWidth}
                progress={pager.progress}
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
    flex: 1,
    height: "100%",
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
});
