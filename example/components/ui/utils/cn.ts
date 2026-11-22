import { StyleProp } from "react-native";

export const cn = (className?: string): StyleProp<any> => {
  return className as any;
};