import { TrayRoot } from "./context/root";
import { TrayTrigger } from "./primitives/trigger";
import { TrayContent } from "./content";
import { TrayFooter } from "./primitives/footer";
import { TrayBody } from "./primitives/body";
import { TrayHeader } from "./primitives/header";
import { TraySection } from "./primitives/section";
import { TraySeparator } from "./primitives/separator";
import { TrayTextInput } from "./primitives/text-input";
import { TrayPage } from "./primitives/page";
import { TrayPages } from "./primitives/pages";
export { useTrayPages } from "./pages-context";

export const Tray = {
  Root: TrayRoot,
  Trigger: TrayTrigger,
  Content: TrayContent,
  Footer: TrayFooter,
  Body: TrayBody,
  Header: TrayHeader,
  Separator: TraySeparator,
  Section: TraySection,
  TextInput: TrayTextInput,
  Page: TrayPage,
  Pages: TrayPages,
};
