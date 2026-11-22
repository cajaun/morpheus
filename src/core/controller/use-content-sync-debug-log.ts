import type React from "react";
import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { isTrayDebugLoggingEnabled, log } from "../logger";

// debug logs of the live step props and of the rendered snapshot
export const useContentSyncDebugLog = ({
  visible,
  trayId,
  content,
  footer,
  header,
  fullScreen,
  fullScreenBackgroundScale,
  renderedFullScreen,
  containerStyle,
  footerStyle,
  className,
  footerClassName,
  interactive,
  renderedTrayId,
  renderedContent,
  renderedFooter,
  renderedHeader,
}: {
  visible: boolean | undefined;
  trayId: string | undefined;
  content: React.ReactNode;
  footer: React.ReactNode;
  header: React.ReactNode;
  fullScreen: boolean | undefined;
  fullScreenBackgroundScale: number | undefined;
  renderedFullScreen: boolean;
  containerStyle: StyleProp<ViewStyle>;
  footerStyle: StyleProp<ViewStyle>;
  className: string | undefined;
  footerClassName: string | undefined;
  interactive: boolean | undefined;
  renderedTrayId: string | undefined;
  renderedContent: React.ReactNode;
  renderedFooter: React.ReactNode;
  renderedHeader: React.ReactNode;
}) => {
  useEffect(() => {
    if (!visible || !isTrayDebugLoggingEnabled()) {
      return;
    }

    log("LIVE STEP PROPS", {
      trayId,
      hasContent: content != null,
      hasFooter: footer != null,
      hasHeader: header != null,
      incomingFullScreen: fullScreen,
      fullScreenBackgroundScale,
      renderedFullScreen,
      hasContainerStyle: containerStyle != null,
      hasFooterStyle: footerStyle != null,
      className,
      footerClassName,
      interactive,
    });
  }, [
    className,
    containerStyle,
    content,
    header,
    footer,
    footerClassName,
    footerStyle,
    fullScreen,
    fullScreenBackgroundScale,
    interactive,
    renderedFullScreen,
    trayId,
    visible,
  ]);

  useEffect(() => {
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("RENDERED CONTENT CHANGED", {
      trayId: renderedTrayId,
      hasContent: renderedContent !== null,
      hasFooter: renderedFooter !== null,
      hasHeader: renderedHeader !== null,
      fullScreen: renderedFullScreen,
    });
  }, [
    renderedContent,
    renderedFooter,
    renderedHeader,
    renderedFullScreen,
    renderedTrayId,
  ]);
};
