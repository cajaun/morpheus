// className support for native components
import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
}
