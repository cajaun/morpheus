import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RenderedTrayState } from "../action-tray-types";

// render state keeps a retained payload for teardown while active trays render
// the live payload from the same commit that changes shell options.
type TraySnapshot = {
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  trayId?: string;
  fullScreen?: boolean;
  fullScreenSafeAreaTop?: boolean;
  fullScreenDraggable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
  footerStyle?: StyleProp<ViewStyle>;
  footerClassName?: string;
};

type PendingContentMeasurement = {
  header: React.ReactNode;
  content: React.ReactNode;
  fullScreen: boolean;
};

const toRenderedTrayState = ({
  header,
  content,
  footer,
  trayId,
  fullScreen,
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
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
});

export const useActionTrayRenderState = ({
  header,
  content,
  footer,
  trayId,
  fullScreen,
  fullScreenSafeAreaTop,
  fullScreenDraggable,
  containerStyle,
  className,
  footerStyle,
  footerClassName,
}: TraySnapshot) => {
  const liveTray = useMemo(
    () =>
      toRenderedTrayState({
        content,
        header,
        footer,
        trayId,
        fullScreen,
        fullScreenSafeAreaTop,
        fullScreenDraggable,
        containerStyle,
        className,
        footerStyle,
        footerClassName,
      }),
    [
      className,
      containerStyle,
      content,
      footer,
      footerClassName,
      footerStyle,
      fullScreen,
      fullScreenDraggable,
      fullScreenSafeAreaTop,
      header,
      trayId,
    ],
  );

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

  const [renderedTray, setRenderedTray] = useState<RenderedTrayState>(
    toRenderedTrayState({
      content,
      header,
      footer,
      trayId,
      fullScreen,
      fullScreenSafeAreaTop,
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
        header: headerRef.current,
        footer: footerRef.current,
        trayId: trayIdRef.current,
        fullScreen: fullScreenRef.current,
        fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
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
      if (trayIdRef.current !== activeTrayId) {
        return current;
      }

      return {
        content: contentRef.current ?? null,
        header: headerRef.current ?? null,
        footer: footerRef.current ?? null,
        trayId: trayIdRef.current,
        fullScreen: fullScreenRef.current,
        fullScreenSafeAreaTop: fullScreenSafeAreaTopRef.current,
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
      header: null,
      footer: null,
      trayId: undefined,
      fullScreen: undefined,
      fullScreenSafeAreaTop: undefined,
      fullScreenDraggable: undefined,
      containerStyle: undefined,
      className: undefined,
      footerStyle: undefined,
      footerClassName: undefined,
    });
  }, []);

  const presentationTray = trayId !== undefined ? liveTray : renderedTray;
  const visualTray = trayId !== undefined ? renderedTray : presentationTray;
  const needsVisualSync =
    trayId !== undefined &&
    (renderedTray.trayId !== liveTray.trayId ||
      renderedTray.content !== liveTray.content ||
      renderedTray.header !== liveTray.header ||
      renderedTray.footer !== liveTray.footer ||
      renderedTray.fullScreen !== liveTray.fullScreen ||
      renderedTray.fullScreenSafeAreaTop !== liveTray.fullScreenSafeAreaTop ||
      renderedTray.fullScreenDraggable !== liveTray.fullScreenDraggable ||
      renderedTray.containerStyle !== liveTray.containerStyle ||
      renderedTray.className !== liveTray.className ||
      renderedTray.footerStyle !== liveTray.footerStyle ||
      renderedTray.footerClassName !== liveTray.footerClassName);
  const pendingContentMeasurement: PendingContentMeasurement | null =
    needsVisualSync
      ? {
          header: liveTray.header,
          content: liveTray.content,
          fullScreen: liveTray.fullScreen ?? false,
        }
      : null;

  return {
    state: {
      renderedContent: visualTray.content,
      renderedHeader: visualTray.header,
      renderedFooter: visualTray.footer,
      renderedTrayId: presentationTray.trayId,
      renderedFullScreen: presentationTray.fullScreen ?? false,
      renderedFullScreenSafeAreaTop:
        presentationTray.fullScreenSafeAreaTop ?? false,
      renderedFullScreenDraggable:
        presentationTray.fullScreenDraggable ?? true,
      renderedContainerStyle: presentationTray.containerStyle,
      renderedClassName: presentationTray.className,
      renderedFooterStyle: presentationTray.footerStyle,
      renderedFooterClassName: presentationTray.footerClassName,
      pendingContentMeasurement,
      needsVisualSync,
    },
    actions: {
      showLatestSnapshot,
      syncRenderedNodes,
      clear,
    },
  };
};
