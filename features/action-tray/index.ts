import { TrayBody } from "./system/primitives/body";
import { TrayFooter } from "./system/primitives/footer";
import { TrayHeader } from "./system/primitives/header";
import { TrayPage } from "./system/primitives/page";
import { TrayPages } from "./system/primitives/pages";
import { TraySection } from "./system/primitives/section";
import { TraySeparator } from "./system/primitives/separator";
import { TrayTextInput } from "./system/primitives/text-input";
import { TrayTrigger } from "./system/primitives/trigger";
import { TrayNested } from "./system/runtime/tray-nested";
import { TrayRoot } from "./system/runtime/tray-root";

// centralize exports here so screens depend on one tray surface area
export { TrayProvider } from "./system/runtime/tray-provider";
export type {
  TrayTriggerHaptics,
  TrayTriggerProps,
} from "./system/primitives/trigger";
export {
  useTrayFlow,
  useTrayHost,
  type TrayRegistration,
  type TrayStepDefinition,
  type TrayStepOptions,
} from "./system/runtime/tray-context";
export { useOptionalTrayPages, useTrayPages } from "./system/pages-context";

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
