// expose presenter internals through one local boundary
export { NestedTrayStack, RootTraySlots } from "./host-slots";
export { createPresentedTray, resolvePresenterTransitionScope } from "./model";
export type {
  PresentedTrayRenderer,
  PresentedTray,
} from "./types";
