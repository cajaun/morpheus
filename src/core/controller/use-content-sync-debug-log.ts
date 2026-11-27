import type React from "react";

import type { StyleProp, ViewStyle } from "react-native";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

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
  interactive: boolean | undefined;
  renderedTrayId: string | undefined;
  renderedContent: React.ReactNode;
  renderedFooter: React.ReactNode;
  renderedHeader: React.ReactNode;
}) => {
  useProfiledTrayEffect("core/controller/use-content-sync-debug-log#1", () => {
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
      interactive,
    });
  }, [
    className,
    containerStyle,
    content,
    header,
    footer,
    footerStyle,
    fullScreen,
    fullScreenBackgroundScale,
    interactive,
    renderedFullScreen,
    trayId,
    visible,
  ]);

  useProfiledTrayEffect("core/controller/use-content-sync-debug-log#2", () => {
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
