import React from "react";
import type { TrayRegistration, TrayStepDefinition } from "./types";

type ComparableRecord = Record<string, unknown>;

const isPlainRecord = (value: unknown): value is ComparableRecord => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const areRecordsEquivalent = (
  left: ComparableRecord,
  right: ComparableRecord,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      areAuthoredValuesEquivalent(left[key], right[key]),
  );
};

// compare authored values before inline jsx reaches the external store as a false definition update
export const areAuthoredValuesEquivalent = (
  left: unknown,
  right: unknown,
): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (React.isValidElement(left) || React.isValidElement(right)) {
    if (!React.isValidElement(left) || !React.isValidElement(right)) {
      return false;
    }

    return (
      left.type === right.type &&
      left.key === right.key &&
      areRecordsEquivalent(
        left.props as ComparableRecord,
        right.props as ComparableRecord,
      )
    );
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    return (
      left.length === right.length &&
      left.every((value, index) =>
        areAuthoredValuesEquivalent(value, right[index]),
      )
    );
  }

  if (isPlainRecord(left) || isPlainRecord(right)) {
    return (
      isPlainRecord(left) &&
      isPlainRecord(right) &&
      areRecordsEquivalent(left, right)
    );
  }

  // functions and non plain objects are meaningful references consumers only need usecallback usememo when those references intentionally form the api
  return false;
};

const areStepsEquivalent = (
  left: TrayStepDefinition,
  right: TrayStepDefinition,
) =>
  left.key === right.key &&
  areAuthoredValuesEquivalent(left.header, right.header) &&
  areAuthoredValuesEquivalent(left.content, right.content) &&
  areAuthoredValuesEquivalent(left.options, right.options);

export const areTrayRegistrationsEquivalent = (
  current: TrayRegistration | undefined,
  next: TrayRegistration,
) =>
  current !== undefined &&
  current.steps.length === next.steps.length &&
  current.steps.every((step, index) =>
    areStepsEquivalent(step, next.steps[index]!),
  ) &&
  areAuthoredValuesEquivalent(current.footer, next.footer) &&
  current.dismissible === next.dismissible &&
  areAuthoredValuesEquivalent(current.transition, next.transition);
