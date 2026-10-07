// verify cached sheet heights survive presentation changes
import React from "react";
import { describe, expect, it } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import TestRenderer, { act } from "react-test-renderer";
import { useTrayHeightCache } from "../use-tray-height-cache";

type HeightCache = ReturnType<typeof useTrayHeightCache>;

// create the mutable height value used by cache probes
const sharedValue = (value: number) => ({ value }) as SharedValue<number>;

// render the cache hook with a controllable fullscreen state
const renderHeightCache = ({ fullScreen = false } = {}) => {
  const contentHeight = sharedValue(0);
  let cache: HeightCache | null = null;

  const Probe = ({ isFullScreen }: { isFullScreen: boolean }) => {
    cache = useTrayHeightCache({
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

describe("useTrayHeightCache QA coverage", () => {
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

  it("does not use a source fullscreen measurement as a sheet fallback", () => {
    const harness = renderHeightCache();

    harness.contentHeight.value = 866;
    expect(
      harness.cache.actions.restoreContentHeight(
        "content-four",
        866,
        "sheet",
        false,
      ),
    ).toBeUndefined();
    expect(harness.contentHeight.value).toBe(0);
  });

  it("clears a stale shared height before measuring an uncached sheet", () => {
    const harness = renderHeightCache();

    harness.contentHeight.value = 356;

    expect(
      harness.cache.actions.restoreContentHeight(
        "content-four",
        356,
        "sheet",
        false,
      ),
    ).toBeUndefined();
    expect(harness.contentHeight.value).toBe(0);
  });

  it("does not reuse a cached sheet frame for a fullscreen-origin handoff", () => {
    const harness = renderHeightCache();

    harness.cache.actions.handleContentHeightResolved(356, 356, "content-four");
    harness.contentHeight.value = 866;

    expect(
      harness.cache.actions.restoreContentHeight(
        "content-four",
        866,
        "sheet",
        false,
      ),
    ).toBeUndefined();
    expect(harness.contentHeight.value).toBe(0);
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

  it("AT-HEIGHT-EP-003 does not cache a fullscreen viewport endpoint", () => {
    const harness = renderHeightCache();

    harness.cache.actions.handleContentHeightResolved(
      760,
      760,
      "content-one",
      "fullScreen",
    );

    expect(
      harness.cache.actions.restoreContentHeight("content-one", 0),
    ).toBeUndefined();
    expect(
      harness.cache.actions.readCachedSheetContentHeight("content-one"),
    ).toBeUndefined();
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
