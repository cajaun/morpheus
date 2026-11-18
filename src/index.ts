import { TrayBody } from "./primitives/body";
import { TrayFooter } from "./primitives/footer";
import { TrayHeader } from "./primitives/header";
import {
  TrayHeaderButton,
  TrayHeaderRow,
} from "./primitives/header";
import { TrayPage } from "./primitives/page";
import { TrayPages } from "./primitives/pages";
import { TraySection } from "./primitives/section";
import { TraySeparator } from "./primitives/separator";
import { TrayTextInput } from "./primitives/text-input";
import { TrayTrigger } from "./primitives/trigger";
import { TrayPrimaryButton } from "./primitives/primary-button";
import { TrayNested } from "./runtime/tray-nested";
import { TrayRoot } from "./runtime/tray-root";
import { TrayStep } from "./runtime/tray-step";

// centralize exports here so screens depend on one tray surface area
export { TrayProvider } from "./core/tray-provider";
export { useTrayOriginProgress } from "./core/tray-origin-progress";
export { useTrayMorphProgress } from "./core/tray-morph-progress";
export { useTrayProgress } from "./core/tray-progress";
export type {
  TrayTriggerHaptics,
  TrayTriggerProps,
} from "./primitives/trigger";
export {
  useTrayKeyboard,
  useTrayHost,
  useTrayNavigation,
  useTrayNavigationActions,
  useTrayNavigationState,
  useTrayTransitionLifecycle,
  type TrayNavigationState,
  type TrayRegistration,
  type TrayStepProps,
  type TrayStepOptions,
  type TrayTransitionContract,
  type TrayTransitionContractState,
  type KeyboardTransitionMode,
  type TrayTransitionLifecycleRecord,
  type TrayGeometrySnapshot,
  type TrayMeasurementOwner,
} from "./runtime/tray-context";
export type { TrayNestedProps } from "./runtime/tray-nested";
export type { TrayTextInputRef } from "./primitives/text-input";
export type { TrayRootProps } from "./runtime/tray-root";
export { useOptionalTrayPages, useTrayPages } from "./pages-context";

// Typed by reference to each component so published type definitions stay
// portable across React Native versions (no inlined internal types).
type TrayNamespace = {
  Root: typeof TrayRoot;
  Nested: typeof TrayNested;
  Trigger: typeof TrayTrigger;
  Footer: typeof TrayFooter;
  Body: typeof TrayBody;
  Header: typeof TrayHeader;
  HeaderRow: typeof TrayHeaderRow;
  HeaderButton: typeof TrayHeaderButton;
  PrimaryButton: typeof TrayPrimaryButton;
  Separator: typeof TraySeparator;
  Section: typeof TraySection;
  TextInput: typeof TrayTextInput;
  Page: typeof TrayPage;
  Pages: typeof TrayPages;
  Step: typeof TrayStep;
};

// the namespace mirrors the mental model used by tray authors
export const Tray: TrayNamespace = {
  Root: TrayRoot,
  Nested: TrayNested,
  Trigger: TrayTrigger,
  Footer: TrayFooter,
  Body: TrayBody,
  Header: TrayHeader,
  HeaderRow: TrayHeaderRow,
  HeaderButton: TrayHeaderButton,
  PrimaryButton: TrayPrimaryButton,
  Separator: TraySeparator,
  Section: TraySection,
  TextInput: TrayTextInput,
  Page: TrayPage,
  Pages: TrayPages,
  Step: TrayStep,
};
