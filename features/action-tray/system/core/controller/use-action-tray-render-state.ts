import React, { useCallback, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";

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
};

type InternalRenderedTrayState = RenderedTrayState & {
  fullScreenTransitionGeneration: number;
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
  current.footerClassName === next.footerClassName;

const commitTraySnapshot = (
  current: InternalRenderedTrayState,
  next: RenderedTrayState,
): InternalRenderedTrayState => {
  if (areTrayStatesEqual(current, next)) {
    // returning current avoids a render when passive sync repeats the same snapshot
    return current;
  }

  const fullScreenModeChanged = !!current.fullScreen !== !!next.fullScreen;

  return {
    ...next,
    // content enter animations use this generation to wait for matching layout start
    fullScreenTransitionGeneration:
      current.fullScreenTransitionGeneration +
      (fullScreenModeChanged ? 1 : 0),
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
      }),
      fullScreenTransitionGeneration: 0,
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
      // keep the ui thread latch monotonic for the lifetime of this host slot
      fullScreenTransitionGeneration:
        current.fullScreenTransitionGeneration,
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
      fullScreenTransitionGeneration:
        renderedTray.fullScreenTransitionGeneration,
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
