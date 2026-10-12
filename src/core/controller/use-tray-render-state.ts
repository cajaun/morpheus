import React, { useCallback, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../types";
import type { TrayTransitionContract } from "../../runtime/types";
import { log } from "../logger";
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";

// render state holds the committed payload while newer props continue to stream in
type TraySnapshot = {
  prepared?: boolean;
  visible?: boolean;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  keyboardAware?: boolean;
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

// convert a prop snapshot into the normalized rendered shell shape
const toRenderedTrayState = ({
  header,
  content,
  footer,
  trayId,
  keyboardAware,
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
  keyboardAware,
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

// compare shell snapshots before publishing another render
const areTrayStatesEqual = (
  current: RenderedTrayState,
  next: RenderedTrayState,
) =>
  current.header === next.header &&
  current.content === next.content &&
  current.footer === next.footer &&
  current.trayId === next.trayId &&
  current.keyboardAware === next.keyboardAware &&
  current.fullScreen === next.fullScreen &&
  current.fullScreenBackgroundScale === next.fullScreenBackgroundScale &&
  current.fullScreenSafeAreaTop === next.fullScreenSafeAreaTop &&
  current.fullScreenDraggable === next.fullScreenDraggable &&
  current.containerStyle === next.containerStyle &&
  current.className === next.className &&
  current.footerStyle === next.footerStyle &&
  current.footerClassName === next.footerClassName &&
  current.transitionContract === next.transitionContract;

// reject transient empty payloads before they erase visible content
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

// expose the fields needed to diagnose a rendered shell snapshot
const describeTrayState = (state: RenderedTrayState) => ({
  trayId: state.trayId,
  fullScreen: state.fullScreen ?? false,
  hasHeader: state.header != null,
  hasContent: state.content != null,
  hasFooter: state.footer != null,
  transitionGeneration: state.transitionContract?.generation,
  transitionBoundary: state.transitionContract?.boundary,
  transition: describeTrayTransition(state.transitionContract),
});

// retain a stable rendered payload while transitions consume new props
export const useTrayRenderState = ({
  prepared = false,
  visible = false,
  header,
  content,
  footer,
  trayId,
  keyboardAware,
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

  const keyboardAwareRef = useRef(keyboardAware);
  keyboardAwareRef.current = keyboardAware;

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

  // A prepared host already owns the controller/native shell. On its first
  // presentation, use the incoming payload during this render instead of
  // waiting for the visibility effect to publish a second snapshot.
  const wasPreparedRef = useRef(prepared);
  const preparedActivation =
    visible && wasPreparedRef.current && prepared !== true;
  wasPreparedRef.current = prepared;

  const [renderedTray, setRenderedTray] =
    useState<InternalRenderedTrayState>(() => ({
      ...toRenderedTrayState({
        content,
        header,
        footer,
        trayId,
        keyboardAware,
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

  const renderedTrayForRender = preparedActivation
    ? toRenderedTrayState({
        content,
        header,
        footer,
        trayId,
        keyboardAware,
        fullScreen,
        fullScreenBackgroundScale,
        fullScreenSafeAreaTop,
        fullScreenDraggable,
        containerStyle,
        className,
        footerStyle,
        footerClassName,
        transitionContract,
      })
    : renderedTray;

  const showLatestSnapshot = useCallback(() => {
    // refs let passive effects publish the newest props without changing callback identity
    const next = toRenderedTrayState({
      content: contentRef.current,
      header: headerRef.current,
      footer: footerRef.current,
      trayId: trayIdRef.current,
      keyboardAware: keyboardAwareRef.current,
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
        keyboardAware: keyboardAwareRef.current,
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
        keyboardAware: undefined,
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
      renderedContent: renderedTrayForRender.content,
      renderedHeader: renderedTrayForRender.header,
      renderedFooter: renderedTrayForRender.footer,
      renderedTrayId: renderedTrayForRender.trayId,
      renderedKeyboardAware: renderedTrayForRender.keyboardAware ?? false,
      renderedFullScreen: renderedTrayForRender.fullScreen ?? false,
      renderedFullScreenBackgroundScale:
        renderedTrayForRender.fullScreenBackgroundScale ?? 1,
      renderedFullScreenSafeAreaTop:
        renderedTrayForRender.fullScreenSafeAreaTop ?? false,
      renderedFullScreenDraggable:
        renderedTrayForRender.fullScreenDraggable ?? true,
      renderedContainerStyle: renderedTrayForRender.containerStyle,
      renderedClassName: renderedTrayForRender.className,
      renderedFooterStyle: renderedTrayForRender.footerStyle,
      renderedFooterClassName: renderedTrayForRender.footerClassName,
      renderedTransitionContract:
        renderedTrayForRender.transitionContract ?? null,
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
