import React from "react";
import type {
  TrayStepDefinition,
  TrayStepOptions,
  TrayStepProps,
} from "./types";
import { TrayStep } from "./tray-step";
import { TrayFooter, type TrayFooterProps } from "../primitives/footer";

type AuthoredElement = React.ReactElement<{
  children?: React.ReactNode;
}>;

// flatten fragments so conditional and mapped step groups compile consistently
const flattenChildren = (children: React.ReactNode): React.ReactNode[] => {
  const flattened: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      flattened.push(
        ...flattenChildren(
          (child as AuthoredElement).props.children,
        ),
      );
      return;
    }

    flattened.push(child);
  });

  return flattened;
};

// identify declarative steps and leave triggers in the rendered tree
const isTrayStepElement = (
  child: React.ReactNode,
): child is React.ReactElement<TrayStepProps> =>
  React.isValidElement(child) && child.type === TrayStep;

const isTrayFooterElement = (
  child: React.ReactNode,
): child is React.ReactElement<TrayFooterProps> =>
  React.isValidElement(child) && child.type === TrayFooter;

// turn one declarative step into the definition consumed by the existing runtime
const compileStep = (
  step: React.ReactElement<TrayStepProps>,
  index: number,
  stepOptions?: TrayStepOptions,
): TrayStepDefinition => {
  const allChildren = flattenChildren(step.props.children).filter(
    (child) => child != null && typeof child !== "boolean",
  );
  // a Tray.Footer anywhere in the step is the step's own footer
  const footers = allChildren.filter(isTrayFooterElement);
  const authoredChildren = allChildren.filter(
    (child) => !isTrayFooterElement(child),
  );

  if (footers.length > 1) {
    throw new Error("Tray.Step accepts at most one Tray.Footer");
  }

  if (authoredChildren.length < 1 || authoredChildren.length > 2) {
    throw new Error(
      "Tray.Step accepts an optional header followed by exactly one content root, plus an optional Tray.Footer",
    );
  }

  const footer = footers[0];

  const options =
    stepOptions || step.props.options
      ? { ...stepOptions, ...step.props.options }
      : undefined;
  const key =
    step.key == null ? `morpheus-step-${index}` : String(step.key);

  return {
    key,
    header: authoredChildren.length === 2 ? authoredChildren[0] : undefined,
    content: authoredChildren[authoredChildren.length - 1] as React.ReactNode,
    ...(footer
      ? {
          footer,
          footerId: footer.props.id,
        }
      : null),
    options,
  };
};

// compile declarative children before registration while keeping runtime contracts unchanged
export const compileTraySteps = (
  children: React.ReactNode,
  stepOptions?: TrayStepOptions,
): TrayStepDefinition[] => {
  const stepElements = flattenChildren(children).filter(isTrayStepElement);

  if (stepElements.length === 0) {
    throw new Error("Tray.Root requires at least one Tray.Step");
  }

  return stepElements.map((step, index) =>
    compileStep(step, index, stepOptions),
  );
};
