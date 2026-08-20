import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  TrayGeometrySnapshot,
  TrayTransitionContract,
  TrayTransitionLifecycle,
} from "../../runtime/types";
import { createTrayMeasurementOwner } from "../../runtime/types";
import { log } from "../logger";
import { createTrayEndpointKey } from "./action-tray-sheet-frame";
import type { ActionTraySheetFrame } from "../types/action-tray";

type Params = {
  visible: boolean;
  rootTrayId?: string;
  trayId?: string;
  fullScreen?: boolean;
  presentationFullScreen: boolean;
  renderedTrayId?: string;
  renderedTransitionContract?: TrayTransitionContract | null;
  transitionContract?: TrayTransitionContract | null;
  transitionLifecycle?: TrayTransitionLifecycle;
};

// geometry ownership keeps measurement identity and boundary leases together
export const useActionTrayGeometryOwnership = ({
  visible,
  rootTrayId,
  trayId,
  fullScreen,
  presentationFullScreen,
  renderedTrayId,
  renderedTransitionContract,
  transitionContract,
  transitionLifecycle,
}: Params) => {
  const returningToSheetRef = useRef(false);
  const [preparedSheetFrame, setPreparedSheetFrame] = useState<
    ActionTraySheetFrame | undefined
  >(undefined);
  const preparedSheetFrameRef = useRef<ActionTraySheetFrame | undefined>(
    undefined,
  );
  const contentMeasurementLeaseRef = useRef(false);
  const renderedTrayIdRef = useRef(renderedTrayId);
  renderedTrayIdRef.current = renderedTrayId;
  const activeTrayIdRef = useRef(trayId);
  activeTrayIdRef.current = trayId;
  const activeTransitionGenerationRef = useRef(transitionContract?.generation);
  activeTransitionGenerationRef.current = transitionContract?.generation;
  const activeTransitionRef = useRef(transitionContract);
  activeTransitionRef.current = transitionContract;
  const renderedTransitionGenerationRef = useRef(
    renderedTransitionContract?.generation,
  );
  const renderedTransitionRef = useRef(renderedTransitionContract);
  renderedTransitionRef.current = renderedTransitionContract;
  renderedTransitionGenerationRef.current =
    renderedTransitionContract?.generation;
  const renderedFullScreenRef = useRef(presentationFullScreen);
  renderedFullScreenRef.current = presentationFullScreen;
  const lastHandledLayoutCompletionGenerationRef = useRef(0);
  const latestLayoutFrameRef = useRef({
    contentHeight: 0,
    footerHeight: 0,
  });
  const latestGeometryRef = useRef<TrayGeometrySnapshot | null>(null);

  const measurementEndpoint =
    renderedTransitionContract?.to ?? renderedTransitionContract?.from;
  const measurementOwner = useMemo(() => {
    if (!rootTrayId || !measurementEndpoint || !renderedTransitionContract) {
      return undefined;
    }

    return createTrayMeasurementOwner({
      rootTrayId,
      endpoint: measurementEndpoint,
      generation: renderedTransitionContract.generation,
    });
  }, [measurementEndpoint, renderedTransitionContract, rootTrayId]);

  useLayoutEffect(() => {
    if (!fullScreen && presentationFullScreen) {
      returningToSheetRef.current = true;
      return;
    }

    if (fullScreen && returningToSheetRef.current) {
      returningToSheetRef.current = false;
    }
  }, [fullScreen, presentationFullScreen]);

  const handleGeometryMeasured = useCallback(
    (
      geometry: Partial<
        Omit<TrayGeometrySnapshot, "owner" | "capturedAt">
      >,
    ) => {
      if (!measurementOwner || !renderedTransitionContract) {
        return;
      }

      const previous = latestGeometryRef.current;
      const snapshot: TrayGeometrySnapshot = {
        ...(previous?.owner.presentationKey ===
        measurementOwner.presentationKey
          ? previous
          : {}),
        ...geometry,
        owner: measurementOwner,
        capturedAt: performance.now(),
      };
      latestGeometryRef.current = snapshot;

      if (geometry.resolvedContentHeight !== undefined) {
        latestLayoutFrameRef.current.contentHeight =
          geometry.resolvedContentHeight;
      }
      if (geometry.measuredFooterHeight !== undefined) {
        latestLayoutFrameRef.current.footerHeight =
          geometry.measuredFooterHeight;
      }

      const role = renderedTransitionContract.to ? "target" : "source";
      transitionLifecycle?.captureGeometry(
        renderedTransitionContract.generation,
        role,
        snapshot,
      );
    }, [measurementOwner, renderedTransitionContract, transitionLifecycle],
  );

  useLayoutEffect(() => {
    const source = renderedTransitionContract?.from;
    const previous = latestGeometryRef.current;

    if (!rootTrayId || !source || !previous || !renderedTransitionContract) {
      return;
    }

    transitionLifecycle?.captureGeometry(
      renderedTransitionContract.generation,
      "source",
      {
        ...previous,
        owner: createTrayMeasurementOwner({
          rootTrayId,
          endpoint: source,
          generation: renderedTransitionContract.generation,
        }),
        capturedAt: performance.now(),
      },
    );
  }, [renderedTransitionContract, rootTrayId, transitionLifecycle]);

  useLayoutEffect(() => {
    const source = transitionContract?.from;
    const previous = latestGeometryRef.current;

    if (
      visible ||
      !rootTrayId ||
      !source ||
      !previous ||
      !transitionContract
    ) {
      return;
    }

    transitionLifecycle?.captureGeometry(
      transitionContract.generation,
      "source",
      {
        ...previous,
        owner: createTrayMeasurementOwner({
          rootTrayId,
          endpoint: source,
          generation: transitionContract.generation,
        }),
        capturedAt: performance.now(),
      },
    );
  }, [rootTrayId, transitionContract, transitionLifecycle, visible]);

  const handleSheetFramePrepared = useCallback(
    (
      height: number,
      role: "source" | "target",
      frameTrayId?: string,
    ) => {
      const activeTransition = activeTransitionRef.current;
      const endpoint =
        role === "source" ? activeTransition?.from : activeTransition?.to;

      if (
        !activeTransition ||
        !endpoint ||
        endpoint.mode !== "sheet" ||
        !Number.isFinite(height) ||
        height <= 0
      ) {
        log("SHEET FRAME IGNORED", {
          activeGeneration: activeTransition?.generation,
          frameTrayId,
          height,
          role,
          endpointKey: endpoint ? createTrayEndpointKey(endpoint) : undefined,
          endpointMode: endpoint?.mode,
        });
        return;
      }

      const frame: ActionTraySheetFrame = {
        endpointKey: createTrayEndpointKey(endpoint),
        generation: activeTransition.generation,
        totalHeight: height,
      };

      contentMeasurementLeaseRef.current = true;
      preparedSheetFrameRef.current = frame;
      setPreparedSheetFrame(frame);
      log("SHEET FRAME PREPARED", {
        activeGeneration: activeTransition.generation,
        endpointKey: frame.endpointKey,
        frameTrayId,
        generation: frame.generation,
        role,
        totalHeight: frame.totalHeight,
      });
    },
    [],
  );

  const clearPreparedSheetFrame = useCallback(() => {
    setPreparedSheetFrame(undefined);
  }, []);

  return {
    state: {
      preparedSheetFrame,
      boundarySnapshotPending:
        transitionContract?.fullScreenChanged === true &&
        (renderedTrayId !== trayId ||
          presentationFullScreen !== !!fullScreen),
      measurementOwner,
    },
    refs: {
      renderedTrayIdRef,
      activeTrayIdRef,
      activeTransitionGenerationRef,
      activeTransitionRef,
      renderedTransitionGenerationRef,
      renderedTransitionRef,
      renderedFullScreenRef,
      lastHandledLayoutCompletionGenerationRef,
      returningToSheetRef,
      latestLayoutFrameRef,
      preparedSheetFrameRef,
      contentMeasurementLeaseRef,
    },
    handlers: {
      handleGeometryMeasured,
      handleSheetFramePrepared,
      clearPreparedSheetFrame,
    },
  };
};
