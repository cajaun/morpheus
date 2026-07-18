import React from "react";
import { describe, expect, it } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import TestRenderer, { act } from "react-test-renderer";
import { useActionTrayHeightCache } from "../use-action-tray-height-cache";

type HeightCache = ReturnType<typeof useActionTrayHeightCache>;

const sharedValue = (value: number) => ({ value }) as SharedValue<number>;

const renderHeightCache = ({ fullScreen = false } = {}) => {
  const contentHeight = sharedValue(0);
  let cache: HeightCache | null = null;

  const Probe = ({ isFullScreen }: { isFullScreen: boolean }) => {
    cache = useActionTrayHeightCache({
      fullScreen: isFullScreen,
      contentHeight,
    });

    return null;
  };

  let renderer: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(<Probe isFullScreen={fullScreen} />);
  });

  return {
    contentHeight,
    get cache() {
      return cache!;
    },
    setFullScreen(next: boolean) {
      act(() => {
        renderer.update(<Probe isFullScreen={next} />);
      });
    },
  };
};

describe("useActionTrayHeightCache QA coverage", () => {
  it("AT-REG-003 restores the height owned by the requested step", () => {
    const harness = renderHeightCache();

    harness.cache.actions.handleContentHeightResolved(320, 300, "content-one");
    harness.cache.actions.handleContentHeightResolved(480, 460, "content-two");

    expect(
      harness.cache.actions.restoreContentHeight("content-one", 999),
    ).toBe(320);
    expect(harness.contentHeight.value).toBe(320);
    expect(
      harness.cache.actions.restoreContentHeight("content-two", 999),
    ).toBe(480);
    expect(harness.contentHeight.value).toBe(480);
  });

  it("AT-HEIGHT-EP-001 falls back to a valid live measurement for an uncached step", () => {
    const harness = renderHeightCache();

    expect(
      harness.cache.actions.restoreContentHeight("new-step", 275),
    ).toBe(275);
    expect(harness.contentHeight.value).toBe(275);
  });

  it("AT-HEIGHT-EP-002 does not restore a sheet cache while fullscreen owns geometry", () => {
    const harness = renderHeightCache();

    harness.cache.actions.handleContentHeightResolved(320, 300, "content-one");
    harness.setFullScreen(true);

    expect(
      harness.cache.actions.restoreContentHeight("content-one", 760),
    ).toBe(760);
    expect(harness.contentHeight.value).toBe(760);
  });

  it.each([
    ["AT-HEIGHT-BVA-001", undefined, 300],
    ["AT-HEIGHT-BVA-002", "unknown", 0],
  ])("%s rejects missing ownership or non-positive measurement", (_id, trayId, measured) => {
    const harness = renderHeightCache();

    expect(
      harness.cache.actions.restoreContentHeight(trayId, measured as number),
    ).toBeUndefined();
    expect(harness.contentHeight.value).toBe(0);
  });
});
