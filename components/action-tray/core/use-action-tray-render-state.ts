import React, { useCallback, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "./action-tray-types";

type TraySnapshot = {
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

const toRenderedTrayState = ({
  content,
  footer,
  trayId,
  fullScreen,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
}: TraySnapshot): RenderedTrayState => ({
  content: content ?? null,
  footer: footer ?? null,
  trayId,
  fullScreen,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
});

export const useActionTrayRenderState = ({
  content,
  footer,
  trayId,
  fullScreen,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
}: TraySnapshot) => {
  const contentRef = useRef(content);
  contentRef.current = content;

  const footerRef = useRef(footer);
  footerRef.current = footer;

  const trayIdRef = useRef(trayId);
  trayIdRef.current = trayId;

  const fullScreenRef = useRef(fullScreen);
  fullScreenRef.current = fullScreen;

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

  const [renderedTray, setRenderedTray] = useState<RenderedTrayState>(
    toRenderedTrayState({
      content,
      footer,
      trayId,
      fullScreen,
      fullScreenDraggable,
      containerStyle,
      className,
      footerStyle,
      footerClassName,
    }),
  );

  const showLatestSnapshot = useCallback(() => {
    setRenderedTray(
      toRenderedTrayState({
        content: contentRef.current,
        footer: footerRef.current,
        trayId: trayIdRef.current,
        fullScreen: fullScreenRef.current,
        fullScreenDraggable: fullScreenDraggableRef.current,
        containerStyle: containerStyleRef.current,
        className: classNameRef.current,
        footerStyle: footerStyleRef.current,
        footerClassName: footerClassNameRef.current,
      }),
    );
  }, []);

  const syncRenderedNodes = useCallback((activeTrayId?: string) => {
    if (activeTrayId === undefined) {
      return;
    }

    setRenderedTray((current) => {
      if (current.trayId !== activeTrayId) {
        return current;
      }

      return {
        content: contentRef.current ?? null,
        footer: footerRef.current ?? null,
        trayId: current.trayId,
        fullScreen: fullScreenRef.current,
        fullScreenDraggable: fullScreenDraggableRef.current,
        containerStyle: containerStyleRef.current,
        className: classNameRef.current,
        footerStyle: footerStyleRef.current,
        footerClassName: footerClassNameRef.current,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setRenderedTray({
      content: null,
      footer: null,
      trayId: undefined,
      fullScreen: undefined,
      fullScreenDraggable: undefined,
      containerStyle: undefined,
      className: undefined,
      footerStyle: undefined,
      footerClassName: undefined,
    });
  }, []);

  return {
    state: {
      renderedContent: renderedTray.content,
      renderedFooter: renderedTray.footer,
      renderedTrayId: renderedTray.trayId,
      renderedFullScreen: renderedTray.fullScreen ?? false,
      renderedFullScreenDraggable: renderedTray.fullScreenDraggable ?? true,
      renderedContainerStyle: renderedTray.containerStyle,
      renderedClassName: renderedTray.className,
      renderedFooterStyle: renderedTray.footerStyle,
      renderedFooterClassName: renderedTray.footerClassName,
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
