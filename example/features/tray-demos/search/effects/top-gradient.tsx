import React from "react";
import { EdgeBlur } from "./edge-blur";
import { useSearchHeaderHeight } from "../header/use-search-header-height";

export const TopGradient = () => {
  const { grossHeight } = useSearchHeaderHeight();

  return <EdgeBlur edge="top" height={grossHeight * 1.2} />;
};
