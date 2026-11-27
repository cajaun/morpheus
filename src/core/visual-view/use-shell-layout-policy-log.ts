
import { describeTrayTransition } from "../diagnostics/tray-transition-diagnostics";
import { isTrayDebugLoggingEnabled, log } from "../logger";
import { type TrayVisualShellProps } from "./props";
import { useProfiledTrayEffect } from "../../telemetry/tray-layout-effect-profiler";

type ShellState = TrayVisualShellProps["state"];

// debug log of the shell's layout policy for each committed transition
export const useShellLayoutPolicyLog = ({
  trayId,
  renderedTrayId,
  assignmentId,
  layoutEnabled,
  shouldUseLayoutAnimation,
  isFullScreenBoundaryTransition,
  fullScreen,
  frameFullScreen,
  presentationFullScreen,
  preparedSheetFrame,
  transitionContract,
}: {
  trayId: TrayVisualShellProps["trayId"];
  renderedTrayId: ShellState["renderedTrayId"];
  assignmentId: number;
  layoutEnabled: ShellState["layoutEnabled"];
  shouldUseLayoutAnimation: boolean;
  isFullScreenBoundaryTransition: boolean;
  fullScreen: TrayVisualShellProps["fullScreen"];
  frameFullScreen: ShellState["frameFullScreen"];
  presentationFullScreen: boolean;
  preparedSheetFrame: ShellState["preparedSheetFrame"];
  transitionContract: TrayVisualShellProps["transitionContract"];
}) => {
  useProfiledTrayEffect("core/visual-view/use-shell-layout-policy-log#1", () => {
    if (!isTrayDebugLoggingEnabled()) {
      return;
    }

    log("SHELL LAYOUT POLICY", {
      trayId,
      renderedTrayId,
      assignmentId,
      layoutEnabled,
      nativeLayoutAnimationEnabled: shouldUseLayoutAnimation,
      fullScreenBoundaryTransition: isFullScreenBoundaryTransition,
      incomingFullScreen: !!fullScreen,
      frameFullScreen,
      presentationFullScreen,
      preparedSheetFrame: preparedSheetFrame
        ? {
            endpointKey: preparedSheetFrame.endpointKey,
            generation: preparedSheetFrame.generation,
            totalHeight: preparedSheetFrame.totalHeight,
            contentHeight: preparedSheetFrame.contentHeight,
          }
        : null,
      transition: describeTrayTransition(transitionContract),
    });
  }, [
    assignmentId,
    frameFullScreen,
    fullScreen,
    isFullScreenBoundaryTransition,
    layoutEnabled,
    preparedSheetFrame,
    presentationFullScreen,
    renderedTrayId,
    shouldUseLayoutAnimation,
    trayId,
    transitionContract,
  ]);
};
