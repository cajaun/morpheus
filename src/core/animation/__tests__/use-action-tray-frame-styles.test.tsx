import React from "react";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import {
  BORDER_RADIUS,
  HORIZONTAL_MARGIN,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../../constants";
import { useActionTrayFrameStyles } from "../use-action-tray-frame-styles";

// probe frame policy by reading returned animated style objects directly
jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");

  return {
    ...Reanimated,
    interpolate: (
      value: number,
      input: readonly number[],
      output: readonly number[],
    ) => (value >= input[input.length - 1] ? output[output.length - 1] : output[0]),
    useAnimatedStyle: (updater: () => object) => updater(),
  };
});

type FrameStyles = ReturnType<typeof useActionTrayFrameStyles>;

const shared = <T,>(value: T) => ({ value });

const renderFrameStyles = ({
  fullScreen = false,
  fullScreenBoundaryTransition = false,
  fullScreenBoundarySourceFullScreen,
  fullScreenBoundaryTargetFullScreen,
  morphProgress = 1,
  preparedSheetFrameHeight,
  preparedSheetFrameGeneration,
  preparedSheetFrameEndpoint = "source",
  shouldUseOriginTransition = false,
  transitionGeneration,
  transitionSourceKey = "source",
  transitionTargetKey = "target",
  transitionStartedGeneration,
  transitionLayoutStartedGeneration,
  transitionCompletedGeneration,
}: {
  fullScreen?: boolean;
  fullScreenBoundaryTransition?: boolean;
  fullScreenBoundarySourceFullScreen?: boolean;
  fullScreenBoundaryTargetFullScreen?: boolean;
  morphProgress?: number;
  preparedSheetFrameHeight?: number;
  preparedSheetFrameGeneration?: number;
  preparedSheetFrameEndpoint?: string;
  shouldUseOriginTransition?: boolean;
  transitionGeneration?: number;
  transitionSourceKey?: string;
  transitionTargetKey?: string;
  transitionStartedGeneration?: number;
  transitionLayoutStartedGeneration?: number;
  transitionCompletedGeneration?: number;
}) => {
  let styles: FrameStyles | null = null;

  const Probe = () => {
    styles = useActionTrayFrameStyles({
      bottom: 20,
      contentHeight: shared(320),
      footerHeight: shared(80),
      fullScreen,
      fullScreenBoundaryTransition,
      fullScreenBoundarySourceFullScreen,
      fullScreenBoundaryTargetFullScreen,
      hasFooter: shared(true),
      keyboardHeight: shared(0),
      morphProgress: shared(morphProgress),
      originProgress: shared(1),
      transitionStartedGeneration: shared(transitionStartedGeneration ?? 0),
      transitionLayoutStartedGeneration: shared(
        transitionLayoutStartedGeneration ?? 0,
      ),
      transitionCompletedGeneration: shared(
        transitionCompletedGeneration ?? 0,
      ),
      preparedSheetFrame:
        preparedSheetFrameHeight !== undefined
          ? {
              endpointKey: preparedSheetFrameEndpoint,
              generation:
                preparedSheetFrameGeneration ?? transitionGeneration ?? 1,
              totalHeight: preparedSheetFrameHeight,
            }
          : undefined,
      shouldUseOriginTransition,
      transition: shouldUseOriginTransition
        ? { open: "expandFromTrigger" }
        : undefined,
      transitionGeneration,
      transitionSourceKey,
      transitionTargetKey,
    });

    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return styles!;
};

describe("useActionTrayFrameStyles", () => {
  it("lets an opened sheet derive height from its children", () => {
    const styles = renderFrameStyles({});

    expect(styles.trayLayoutStyle.height).toBe("auto");
  });

  it("releases a concrete return height after fullscreen cleanup", () => {
    let styles: FrameStyles | null = null;

    const Probe = ({ prepared }: { prepared: boolean }) => {
      styles = useActionTrayFrameStyles({
        bottom: 20,
        contentHeight: shared(320),
        footerHeight: shared(80),
        fullScreen: false,
        fullScreenBoundaryTransition: false,
        hasFooter: shared(true),
        keyboardHeight: shared(0),
        morphProgress: shared(1),
        originProgress: shared(1),
        preparedSheetFrame: prepared
          ? { endpointKey: "target", generation: 7, totalHeight: 400 }
          : undefined,
        shouldUseOriginTransition: false,
        transition: undefined,
        transitionGeneration: prepared ? 7 : undefined,
        transitionTargetKey: "target",
      });

      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(
        <Probe prepared />,
      );
    });

    // returning from fullscreen temporarily owns a concrete sheet frame
    expect(styles!.trayLayoutStyle.height).toBe(400);

    act(() => {
      renderer!.update(<Probe prepared={false} />);
    });

    // cleanup must release that frame so later sheets use intrinsic height
    expect(styles!.trayLayoutStyle.height).toBe("auto");
  });

  it("keeps fullscreen geometry explicit", () => {
    const styles = renderFrameStyles({ fullScreen: true });

    expect(styles.trayLayoutStyle.height).toBe(SCREEN_HEIGHT);
    expect(styles.trayLayoutStyle.borderRadius).toBe(BORDER_RADIUS);
    expect(styles.presentationFrameStyle?.height).toBe(SCREEN_HEIGHT);
    expect(styles.footerContainerStyle.borderTopLeftRadius).toBe(0);
    expect(styles.footerContainerStyle.borderTopRightRadius).toBe(0);
    expect(styles.footerContainerStyle.borderBottomLeftRadius).toBe(
      BORDER_RADIUS,
    );
    expect(styles.footerContainerStyle.borderBottomRightRadius).toBe(
      BORDER_RADIUS,
    );
  });

  it("keeps ordinary step footers fixed", () => {
    const sheet = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: false,
    });

    expect(sheet.footerContainerStyle.left).toBe(16);
    expect(sheet.footerContainerStyle.right).toBe(16);
    expect(sheet.footerContainerStyle.bottom).toBe(20);
  });

  it("keeps the footer vertically fixed while entering fullscreen", () => {
    const entering = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 0,
    });
    const settled = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 1,
    });

    expect(entering.footerContainerStyle.left).toBe(16);
    expect(entering.footerContainerStyle.right).toBe(16);
    expect(entering.footerContainerStyle.bottom).toBe(20);
    expect(settled.footerContainerStyle.left).toBe(0);
    expect(settled.footerContainerStyle.right).toBe(0);
    expect(settled.footerContainerStyle.bottom).toBe(20);
  });

  it("uses matching shell and footer anchors when returning to a sheet", () => {
    const settledFullscreen = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: false,
      morphProgress: 1,
    });
    const source = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: true,
      fullScreenBoundaryTargetFullScreen: false,
      morphProgress: 0,
    });
    const target = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: true,
      fullScreenBoundaryTargetFullScreen: false,
      morphProgress: 1,
    });

    expect(settledFullscreen.footerContainerStyle.bottom).toBe(20);
    // fullscreen and sheet footer frames share the safe area anchor to prevent a return drop
    expect(source.footerContainerStyle.bottom).toBe(
      settledFullscreen.footerContainerStyle.bottom,
    );
    expect(target.footerContainerStyle.bottom).toBe(20);
    expect(source.trayLayoutStyle.top).toBe(0);
    expect(target.trayLayoutStyle.top).toBe(SCREEN_HEIGHT - 20 - 400);
  });

  it("keeps boundary content bounded to the source viewport until morph begins", () => {
    const source = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 0,
      transitionGeneration: 7,
      transitionStartedGeneration: 0,
    });
    const target = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 1,
      transitionGeneration: 7,
      transitionStartedGeneration: 7,
    });

    expect(source.contentFrameStyle.position).toBe("absolute");
    expect(source.contentBoundarySourceStyle?.position).toBe("absolute");
    expect(source.contentBoundarySourceStyle?.width).toBe(
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    );
    expect(source.contentFrameStyle.width).toBe(
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    );
    expect(target.contentFrameStyle.position).toBe("absolute");
    expect(target.contentBoundarySourceStyle?.width).toBe(
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    );
    expect(target.contentFrameStyle.top).toBe(0);
    expect(target.contentFrameStyle.bottom).toBe(0);
    expect(
      (target.contentFrameStyle as { width?: number }).width,
    ).toBe(SCREEN_WIDTH);
    expect(source.trayLayoutStyle.left).toBe(16);
    expect(target.trayLayoutStyle.left).toBe(0);
  });

  it("joins shell geometry when the shared content clock starts", () => {
    const styles = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 1,
      transitionGeneration: 7,
      transitionStartedGeneration: 7,
      transitionLayoutStartedGeneration: 0,
    });

    expect(styles.trayLayoutStyle.left).toBe(0);
    expect(styles.footerContainerStyle.left).toBe(0);
  });

  it("keeps the incoming fullscreen root inside the bounded source viewport", () => {
    const source = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      transitionGeneration: 7,
      transitionStartedGeneration: 0,
    });
    const target = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      transitionGeneration: 7,
      transitionStartedGeneration: 7,
    });

    expect(source.contentViewportStyle).toEqual({ flex: 1 });
    expect(target.contentViewportStyle).toEqual({ flex: 1 });
  });

  it("leases a nonzero source content frame before fullscreen clock start", () => {
    const styles = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      preparedSheetFrameHeight: 500,
      preparedSheetFrameGeneration: 7,
      preparedSheetFrameEndpoint: "source",
      transitionGeneration: 7,
      transitionStartedGeneration: 0,
      morphProgress: 0,
    });

    expect(styles.contentBoundarySourceStyle?.height).toBe(500);
    expect(styles.contentFrameStyle.height).toBe(500);
  });

  it("clears fullscreen-only animated content geometry when returning to a sheet", () => {
    const styles = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: false,
    });

    expect(styles.contentFrameStyle.position).toBe("relative");
    expect(styles.contentFrameStyle.top).toBe(0);
    expect(styles.contentFrameStyle.bottom).toBe(0);
    expect(styles.contentFrameStyle.width).toBe("auto");
    expect(styles.trayLayoutStyle.width).toBe("auto");
  });

  it("keeps a sheet-boundary content layer at its target width", () => {
    const styles = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: true,
      fullScreenBoundaryTargetFullScreen: false,
      morphProgress: 0,
    });

    expect(
      (styles.contentFrameStyle as { width?: number }).width,
    ).toBe(
      SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    );
    expect(styles.contentFrameStyle.position).toBe("absolute");
    expect(styles.contentFrameStyle.top).toBe(0);
    expect(styles.contentFrameStyle.bottom).toBe(0);
  });

  it("leases the source sheet frame before fullscreen takes ownership", () => {
    const styles = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      preparedSheetFrameHeight: 500,
      preparedSheetFrameGeneration: 7,
      preparedSheetFrameEndpoint: "source",
      transitionGeneration: 7,
      morphProgress: 0,
    });

    expect(styles.trayLayoutStyle.height).toBe(500);
    expect(styles.trayLayoutStyle.top).toBe(SCREEN_HEIGHT - 20 - 500);
    expect(styles.trayLayoutStyle.bottom).toBe("auto");
  });

  it("ignores a prepared sheet frame from a previous boundary", () => {
    const styles = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      preparedSheetFrameHeight: 500,
      preparedSheetFrameGeneration: 6,
      preparedSheetFrameEndpoint: "source",
      transitionGeneration: 7,
      transitionStartedGeneration: 7,
      transitionLayoutStartedGeneration: 7,
      transitionCompletedGeneration: 7,
    });

    expect(styles.trayLayoutStyle.height).toBe(400);
  });

  it("ignores a current-generation frame for an unrelated endpoint", () => {
    const styles = renderFrameStyles({
      fullScreen: false,
      fullScreenBoundaryTransition: true,
      preparedSheetFrameHeight: 500,
      preparedSheetFrameGeneration: 7,
      preparedSheetFrameEndpoint: "unrelated",
      transitionGeneration: 7,
      transitionSourceKey: "source",
      transitionTargetKey: "target",
      transitionStartedGeneration: 7,
      transitionLayoutStartedGeneration: 7,
      transitionCompletedGeneration: 7,
    });

    expect(styles.trayLayoutStyle.height).toBe(400);
  });

  it("leaves concrete presentation frames disabled during a fullscreen boundary", () => {
    const styles = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
    });

    expect(styles.presentationFrameStyle).toBeUndefined();
  });

  it("holds the source frame when a new generation sees stale completed progress", () => {
    const styles = renderFrameStyles({
      fullScreen: true,
      fullScreenBoundaryTransition: true,
      fullScreenBoundarySourceFullScreen: false,
      fullScreenBoundaryTargetFullScreen: true,
      morphProgress: 1,
      transitionGeneration: 3,
      transitionStartedGeneration: 2,
      transitionLayoutStartedGeneration: 2,
      transitionCompletedGeneration: 2,
    });

    expect(styles.trayLayoutStyle.left).toBe(HORIZONTAL_MARGIN);
    expect(styles.footerContainerStyle.left).toBe(HORIZONTAL_MARGIN);
    expect(styles.footerContainerStyle.right).toBe(HORIZONTAL_MARGIN);
  });

  it("uses measured sheet geometry while returning from fullscreen", () => {
    const styles = renderFrameStyles({
      preparedSheetFrameHeight: 400,
      preparedSheetFrameEndpoint: "target",
      preparedSheetFrameGeneration: 7,
      transitionGeneration: 7,
      transitionTargetKey: "target",
    });

    expect(styles.trayLayoutStyle.height).toBe(400);
    expect(styles.presentationFrameStyle?.height).toBe(400);
  });

  it("keeps an explicit interpolated height during origin expansion", () => {
    const styles = renderFrameStyles({ shouldUseOriginTransition: true });

    expect(typeof styles.trayLayoutStyle.height).toBe("number");
    expect(styles.trayLayoutStyle.height).toBeGreaterThan(320);
  });
});
