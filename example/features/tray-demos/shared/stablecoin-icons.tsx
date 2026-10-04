import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

const STABLECOIN_ASSETS = {
  gho: require("../../../assets/images/stablecoin-gho.svg"),
  usdc: require("../../../assets/images/stablecoin-usdc.svg"),
  usdt: require("../../../assets/images/stablecoin-usdt.svg"),
} as const;

const AAVE_BORROW_ASSET = require("../../../assets/images/aave-borrow.svg");

export type StablecoinIconKind = keyof typeof STABLECOIN_ASSETS;

export const AaveBorrowIcon = ({
  width = 52,
  height = 69,
  style,
}: {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}) => (
  <Image
    source={AAVE_BORROW_ASSET}
    contentFit="contain"
    style={[{ width, height }, style]}
  />
);

export const StablecoinIcon = ({
  kind,
  size = 28,
  style,
}: {
  kind: StablecoinIconKind;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) => (
  <Image
    source={STABLECOIN_ASSETS[kind]}
    contentFit="contain"
    style={[{ width: size, height: size }, style]}
  />
);
