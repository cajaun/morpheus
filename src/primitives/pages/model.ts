import React from "react";
import { TrayPage } from "../page";
import {
  isElementOfType,
  TrayPagesFooterSlot,
  TrayPagesHeaderSlot,
} from "./slots";

// keep page movement rules testable without rendering the pager
export const PAGE_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
} as const;

export const clampPageIndex = (index: number, totalPages: number) => {
  if (totalPages <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, totalPages - 1));
};

export const isTrayPageInRenderWindow = (
  index: number,
  pageIndex: number,
  transitionFromIndex: number | null = null,
) => index === pageIndex || index === transitionFromIndex;

export type ParsedTrayPages = {
  header: React.ReactNode;
  footer: React.ReactNode;
  pages: React.ReactElement[];
};

// child parsing keeps pager structure independent from transition state
export const parseTrayPagesChildren = (
  children: React.ReactNode,
): ParsedTrayPages => {
  const pages: React.ReactElement[] = [];
  let header: React.ReactNode = null;
  let footer: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (isElementOfType(child, TrayPagesHeaderSlot)) {
      header = child.props.shell ? null : child.props.children;
      return;
    }

    if (isElementOfType(child, TrayPagesFooterSlot)) {
      footer = child;
      return;
    }

    if (isElementOfType(child, TrayPage)) {
      pages.push(child);
    }
  });

  return { header, footer, pages };
};
