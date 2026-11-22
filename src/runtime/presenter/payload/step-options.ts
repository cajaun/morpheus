import {
  resolveTrayStepOptions,
  type ResolvedTrayStepOptions,
} from "../../tray-context";
import type { TrayStepDefinition } from "../../types";

export type ContextualStepOptionsCache = {
  withFooter?: ResolvedTrayStepOptions;
  withoutFooter?: ResolvedTrayStepOptions;
};

// cache resolved options per immutable step descriptor so derivation allocates nothing on unrelated notifications
export const contextualStepOptionsCache = new WeakMap<
  TrayStepDefinition,
  ContextualStepOptionsCache
>();

// resolved step options with the step's footer presence
export const resolveContextualStepOptions = (
  step: TrayStepDefinition,
  hasFooter: boolean,
): ResolvedTrayStepOptions => {
  const cached = contextualStepOptionsCache.get(step) ?? {};
  const cachedOptions = hasFooter ? cached.withFooter : cached.withoutFooter;

  if (cachedOptions !== undefined) {
    return cachedOptions;
  }

  const resolvedOptions = resolveTrayStepOptions(step.options);

  if (resolvedOptions.hasFooter === hasFooter) {
    if (hasFooter) {
      cached.withFooter = resolvedOptions;
    } else {
      cached.withoutFooter = resolvedOptions;
    }

    contextualStepOptionsCache.set(step, cached);

    return resolvedOptions;
  }

  const contextualOptions = {
    ...resolvedOptions,
    hasFooter,
  };

  if (hasFooter) {
    cached.withFooter = contextualOptions;
  } else {
    cached.withoutFooter = contextualOptions;
  }

  contextualStepOptionsCache.set(step, cached);

  return contextualOptions;
};
