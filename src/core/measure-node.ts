// on Fabric, measure() in a layout effect reads the layout of the commit in progress
export type TrayMeasureCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
) => void;

type MeasurableNode = { measure?: (callback: TrayMeasureCallback) => void };

// false when the node is unmounted or has no native measure()
export const measureTrayNode = (
  node: unknown,
  callback: TrayMeasureCallback,
) => {
  const measurable = node as MeasurableNode | null;

  if (typeof measurable?.measure !== "function") {
    return false;
  }

  measurable.measure(callback);
  return true;
};
