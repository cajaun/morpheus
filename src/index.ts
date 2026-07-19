import { TrayBody } from "./primitives/body";
import { TrayFooter } from "./primitives/footer";
import { TrayHeader } from "./primitives/header";
import { TrayPage } from "./primitives/page";
import { TrayPages } from "./primitives/pages";
import { TraySection } from "./primitives/section";
import { TraySeparator } from "./primitives/separator";
import { TrayTextInput } from "./primitives/text-input";
import { TrayTrigger } from "./primitives/trigger";
import { TrayNested } from "./runtime/tray-nested";
import { TrayRoot } from "./runtime/tray-root";

// centralize exports here so screens depend on one tray surface area
export { TrayProvider } from "./runtime/tray-provider";
export { useTrayOriginProgress } from "./core/tray-origin-progress";
export { useTrayMorphProgress } from "./core/tray-morph-progress";
export type {
  TrayTriggerHaptics,
  TrayTriggerProps,
} from "./primitives/trigger";
export {
  useTrayFlow,
  useTrayHost,
  useTrayTransitionLifecycle,
  type TrayRegistration,
  type TrayStepDefinition,
  type TrayStepOptions,
  type TrayTransitionContract,
  type TrayTransitionLifecycleRecord,
  type TrayGeometrySnapshot,
  type TrayMeasurementOwner,
} from "./runtime/tray-context";
export { useOptionalTrayPages, useTrayPages } from "./pages-context";

// the namespace mirrors the mental model used by tray authors
export const Tray = {
  Root: TrayRoot,
  Nested: TrayNested,
  Trigger: TrayTrigger,
  Footer: TrayFooter,
  Body: TrayBody,
  Header: TrayHeader,
  Separator: TraySeparator,
  Section: TraySection,
  TextInput: TrayTextInput,
  Page: TrayPage,
  Pages: TrayPages,
};
