import { TrayBody } from "./system/primitives/body";
import { TrayFooter } from "./system/primitives/footer";
import { TrayHeader } from "./system/primitives/header";
import { TrayPage } from "./system/primitives/page";
import { TrayPages } from "./system/primitives/pages";
import { TraySection } from "./system/primitives/section";
import { TraySeparator } from "./system/primitives/separator";
import { TrayTextInput } from "./system/primitives/text-input";
import { TrayTrigger } from "./system/primitives/trigger";
import { TrayRoot } from "./system/runtime/tray-root";

export { TrayProvider } from "./system/runtime/tray-provider";
export {
  useTrayFlow,
  useTrayHost,
  type TrayRegistration,
  type TrayStepDefinition,
  type TrayStepOptions,
} from "./system/runtime/tray-context";
export { useTrayPages } from "./system/pages-context";

export const Tray = {
  Root: TrayRoot,
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
