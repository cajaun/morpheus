// expose presenter internals through one local boundary
export { NestedTrayStack, RootTraySlots } from "./host-slots";
export {
  arePresentedTrayListsEquivalent,
  arePresentedTraysEquivalent,
  createPresentedTray,
  resolvePresenterTransitionScope,
} from "./model";
export { createTrayPresenterStateSelector } from "./presenter-state-selector";
export type {
  PresentedTrayRenderer,
  PresentedTray,
} from "./types";
