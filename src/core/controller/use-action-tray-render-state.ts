import React, { useCallback, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";
import type { TrayTransitionContract } from "../../runtime/types";

// render state holds the committed payload while newer props continue to stream in
type TraySnapshot = {
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenBackgroundScale?: number;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
  transitionContract?: TrayTransitionContract | null;
};

type InternalRenderedTrayState = RenderedTrayState & {
  fullScreenTransitionGeneration: number;
  layoutTransitionGeneration: number;
};

const toRenderedTrayState = ({
  header,
  content,
  footer,
  trayId,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
}: TraySnapshot): RenderedTrayState => ({
  header: header ?? null,
  content: content ?? null,
  footer: footer ?? null,
  trayId,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
});

const areTrayStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.header === next.header &&
  current.content === next.content &&
  current.footer === next.footer &&
  current.trayId === next.trayId &&
  current.fullScreen === next.fullScreen &&
  current.fullScreenBackgroundScale === next.fullScreenBackgroundScale &&
  current.fullScreenSafeAreaTop === next.fullScreenSafeAreaTop &&
  current.fullScreenDraggable === next.fullScreenDraggable &&
  current.containerStyle === next.containerStyle &&
  current.className === next.className &&
  current.footerStyle === next.footerStyle &&
  current.footerClassName === next.footerClassName &&
  current.transitionContract === next.transitionContract;

const commitTraySnapshot = (
  current: InternalRenderedTrayState,
  next: RenderedTrayState,
): InternalRenderedTrayState => {
  if (areTrayStatesEqual(current, next)) {
    // returning current avoids a render when passive sync repeats the same snapshot
    return current;
  }

  const fullScreenModeChanged = !!current.fullScreen !== !!next.fullScreen;
  const keyedStepChanged =
    current.trayId !== undefined &&
    next.trayId !== undefined &&
    current.trayId !== next.trayId;

  return {
    ...next,
    // content enter animations use this generation to wait for matching layout start
    fullScreenTransitionGeneration:
      fullScreenModeChanged
        ? next.transitionContract?.generation ??
          current.fullScreenTransitionGeneration + 1
        : current.fullScreenTransitionGeneration,
    // Every keyed step swap gets an event generation. Entering content uses it
    // to join the native layout animation's actual UI-frame start.
    layoutTransitionGeneration:
      keyedStepChanged
        ? next.transitionContract?.generation ??
          current.layoutTransitionGeneration + 1
        : current.layoutTransitionGeneration,
  };
};

export const useActionTrayRenderState = ({
  header,
  content,
  footer,
  trayId,
  fullScreen,
  fullScreenBackgroundScale,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
  transitionContract,
}: TraySnapshot) => {
  const headerRef = useRef(header);
  headerRef.current = header;

  const contentRef = useRef(content);
  contentRef.current = content;

  const footerRef = useRef(footer);
  footerRef.current = footer;

  const trayIdRef = useRef(trayId);
  trayIdRef.current = trayId;

  const fullScreenRef = useRef(fullScreen);
  fullScreenRef.current = fullScreen;

  const fullScreenBackgroundScaleRef = useRef(fullScreenBackgroundScale);
  fullScreenBackgroundScaleRef.current = fullScreenBackgroundScale;

  const fullScreenSafeAreaTopRef = useRef(fullScreenSafeAreaTop);
  fullScreenSafeAreaTopRef.current = fullScreenSafeAreaTop;

  const fullScreenDraggableRef = useRef(fullScreenDraggable);
  fullScreenDraggableRef.current = fullScreenDraggable;

  const containerStyleRef = useRef(containerStyle);
  containerStyleRef.current = containerStyle;

  const classNameRef = useRef(className);
  classNameRef.current = className;

  const footerStyleRef = useRef(footerStyle);
  footerStyleRef.current = footerStyle;

  const footerClassNameRef = useRef(footerClassName);
  footerClassNameRef.current = footerClassName;

  const transitionContractRef = useRef(transitionContract);
  transitionContractRef.current = transitionContract;

  const [renderedTray, setRenderedTray] =
    useState<InternalRenderedTrayState>(() => ({
      ...toRenderedTrayState({
        content,
        header,
        footer,
        trayId,
        fullScreen,
        fullScreenBackgroundScale,
        fullScreenSafeAreaTop,
        fullScreenDraggable,
        containerStyle,
        className,
        footerStyle,
        footerClassName,
        transitionContract,
      }),
      fullScreenTransitionGeneration: 0,
      layoutTransitionGeneration: 0,
    }));

  const showLatestSnapshot = useCallback(() => {
    // refs let passive effects publish the newest props without changing callback identity
    const next = toRenderedTrayState({
      content: contentRef.current,
      header: headerRef.current,
      footer: footerRef.current,
      trayId: trayIdRef.current,
      fullScreen: fullScreenRef.current,
      fullScreenBackgroundScale: fullScreenBackgroundScaleRef.current,
      fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
      fullScreenDraggable: fullScreenDraggableRef.current,
      containerStyle: containerStyleRef.current,
      className: classNameRef.current,
      footerStyle: footerStyleRef.current,
      footerClassName: footerClassNameRef.current,
      transitionContract: transitionContractRef.current,
    });

    setRenderedTray((current) => commitTraySnapshot(current, next));
  }, []);

  const syncRenderedNodes = useCallback((activeTrayId?: string) => {
    if (activeTrayId === undefined) {
      return;
    }

    setRenderedTray((current) => {
      if (current.trayId !== activeTrayId) {
        // same-host node sync must not steal a transition owned by another tray id
        return current;
      }

      const next = {
        content: contentRef.current ?? null,
        header: headerRef.current ?? null,
        footer: footerRef.current ?? null,
        trayId: current.trayId,
        fullScreen: fullScreenRef.current,
        fullScreenBackgroundScale: fullScreenBackgroundScaleRef.current,
        fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
        fullScreenDraggable: fullScreenDraggableRef.current,
        containerStyle: containerStyleRef.current,
        className: classNameRef.current,
        footerStyle: footerStyleRef.current,
        footerClassName: footerClassNameRef.current,
        transitionContract: transitionContractRef.current,
      };

      return commitTraySnapshot(current, next);
    });
  }, []);

  const clear = useCallback(() => {
    setRenderedTray((current) => ({
      content: null,
      header: null,
      footer: null,
      trayId: undefined,
      fullScreen: undefined,
      fullScreenBackgroundScale: undefined,
      fullScreenSafeAreaTop: undefined,
      fullScreenDraggable: undefined,
      containerStyle: undefined,
      className: undefined,
      footerStyle: undefined,
      footerClassName: undefined,
      transitionContract: null,
      // keep the ui thread latch monotonic for the lifetime of this host slot
      fullScreenTransitionGeneration:
        current.fullScreenTransitionGeneration,
      layoutTransitionGeneration: current.layoutTransitionGeneration,
    }));
  }, []);

  return {
    state: {
      renderedContent: renderedTray.content,
      renderedHeader: renderedTray.header,
      renderedFooter: renderedTray.footer,
      renderedTrayId: renderedTray.trayId,
      renderedFullScreen: renderedTray.fullScreen ?? false,
      renderedFullScreenBackgroundScale:
        renderedTray.fullScreenBackgroundScale ?? 1,
      renderedFullScreenSafeAreaTop: renderedTray.fullScreenSafeAreaTop ?? false,
      renderedFullScreenDraggable: renderedTray.fullScreenDraggable ?? true,
      renderedContainerStyle: renderedTray.containerStyle,
      renderedClassName: renderedTray.className,
      renderedFooterStyle: renderedTray.footerStyle,
      renderedFooterClassName: renderedTray.footerClassName,
      renderedTransitionContract: renderedTray.transitionContract ?? null,
      fullScreenTransitionGeneration:
        renderedTray.fullScreenTransitionGeneration,
      layoutTransitionGeneration:
        renderedTray.layoutTransitionGeneration,
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
