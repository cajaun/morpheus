import { BlurView } from "expo-blur";
import type { BlurTint } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { easeGradient } from "react-native-easing-gradient";
import { useTrayDemoTheme } from "../../theme";

type GradientConfig = {
  colors: [string, string, ...string[]];
  locations: [number, number, ...number[]];
};

const topMaskGradient = easeGradient({
  colorStops: {
    0: { color: "black" },
    0.5: { color: "rgba(0,0,0,0.99)" },
    1: { color: "transparent" },
  },
}) as GradientConfig;

const bottomMaskGradient = easeGradient({
  colorStops: {
    0: { color: "transparent" },
    0.5: { color: "rgba(0,0,0,0.99)" },
    1: { color: "black" },
  },
}) as GradientConfig;

type EdgeBlurProps = {
  edge: "top" | "bottom";
  height: number;
  intensity?: number;
  tint?: BlurTint;
};

export const EdgeBlur = ({
  edge,
  height,
  intensity = 42,
  tint = "default",
}: EdgeBlurProps) => {
  const theme = useTrayDemoTheme();
  const maskGradient = edge === "top" ? topMaskGradient : bottomMaskGradient;
  const fallbackGradient = React.useMemo(() => {
    const colorStops =
      edge === "top"
        ? {
            0: { color: theme.veilSolid },
            0.5: { color: theme.veilMid },
            1: { color: theme.veilTransparent },
          }
        : {
            0: { color: theme.veilTransparent },
            0.5: { color: theme.veilMid },
            1: { color: theme.veilSolid },
          };

    return easeGradient({ colorStops }) as GradientConfig;
  }, [edge, theme.veilMid, theme.veilSolid, theme.veilTransparent]);

  if (Platform.OS === "android") {
    return (
      <LinearGradient
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          edge === "top" ? styles.top : styles.bottom,
          { height },
        ]}
        colors={fallbackGradient.colors}
        locations={fallbackGradient.locations}
      />
    );
  }

  return (
    <MaskedView
      pointerEvents="none"
      maskElement={
        <LinearGradient
          locations={maskGradient.locations}
          colors={maskGradient.colors}
          style={StyleSheet.absoluteFill}
        />
      }
      style={[
        StyleSheet.absoluteFill,
        edge === "top" ? styles.top : styles.bottom,
        { height },
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={fallbackGradient.colors}
        locations={fallbackGradient.locations}
      />
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  bottom: {
    bottom: 0,
    top: "auto",
  },
  top: {
    bottom: "auto",
    top: 0,
  },
});
