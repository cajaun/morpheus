import React, { useCallback, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";
import type { TrayTransitionContract } from "../../runtime/types";
import { log } from "../logger";

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

type InternalRenderedTrayState = RenderedTrayState;

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
  const isTransientEmptyPayload =
    current.trayId !== undefined &&
    next.trayId !== undefined &&
    current.trayId === next.trayId &&
    current.fullScreen === next.fullScreen &&
    next.header == null &&
    next.content == null &&
    (current.header != null || current.content != null);

  if (isTransientEmptyPayload) {
    log("RENDER SNAPSHOT PUBLISH IGNORED — transient empty payload", {
      current: describeTrayState(current),
      next: describeTrayState(next),
    });
    return current;
  }

  if (areTrayStatesEqual(current, next)) {
    // returning current avoids a render when passive sync repeats the same snapshot
    return current;
  }

  return next;
};

const describeTrayState = (state: RenderedTrayState) => ({
  trayId: state.trayId,
  fullScreen: state.fullScreen ?? false,
  hasHeader: state.header != null,
  hasContent: state.content != null,
  hasFooter: state.footer != null,
  transitionGeneration: state.transitionContract?.generation,
  transitionBoundary: state.transitionContract?.boundary,
});

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

    setRenderedTray((current) => {
      log("RENDER SNAPSHOT PUBLISH", {
        current: describeTrayState(current),
        next: describeTrayState(next),
      });
      return commitTraySnapshot(current, next);
    });
  }, []);

  const syncRenderedNodes = useCallback((activeTrayId?: string) => {
    if (activeTrayId === undefined) {
      return;
    }

    setRenderedTray((current) => {
      if (current.trayId !== activeTrayId) {
        log("RENDER SNAPSHOT SYNC IGNORED", {
          activeTrayId,
          current: describeTrayState(current),
        });
        // same host node sync must not steal a transition owned by another tray id
        return current;
      }

      const next = {
        // preserve committed regions across native prop gaps real step changes publish a new snapshot
        content:
          contentRef.current ??
          (fullScreenRef.current === current.fullScreen
            ? current.content
            : null),
        header:
          headerRef.current ??
          (fullScreenRef.current === current.fullScreen
            ? current.header
            : null),
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

      log("RENDER SNAPSHOT NODE SYNC", {
        current: describeTrayState(current),
        next: describeTrayState(next),
      });
      return commitTraySnapshot(current, next);
    });
  }, []);

  const clear = useCallback(() => {
    setRenderedTray((current) => {
      log("RENDER SNAPSHOT CLEAR", {
        current: describeTrayState(current),
      });
      return {
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
      };
    });
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
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
