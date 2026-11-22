import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";

export const AaveStyleStepHeader = ({
  title,
  first = false,
}: {
  title: string;
  first?: boolean;
}) => {
  const { close, back } = useTrayNavigation();
  const isFirstStep = first;

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={
          isFirstStep ? undefined : (
            <Tray.HeaderButton onPress={back}>
              <SymbolView
                name="chevron.left"
                type="palette"
                tintColor="#787878"
                size={TRAY_HEADER_CLOSE_ICON_SIZE}
                weight="semibold"
              />
            </Tray.HeaderButton>
          )
        }
        right={
          isFirstStep ? (
            <Tray.HeaderButton onPress={close}>
              <SymbolView
                name="xmark"
                type="palette"
                tintColor="#787878"
                size={TRAY_HEADER_CLOSE_ICON_SIZE}
                weight="bold"
              />
            </Tray.HeaderButton>
          ) : undefined
        }
      >
        <Text className="font-semibold text-black" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

export const DemoCard = ({
  height,
  color,
  tint,
  icon,
}: {
  height: number;
  color: string;
  tint: string;
  icon: SFSymbol;
}) => (
  <View
    style={{
      height,
      borderRadius: 24,
      backgroundColor: color,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <SymbolView name={icon} tintColor={tint} size={64} weight="bold" />
  </View>
);

export const DemoCopy = ({ children }: { children: ReactNode }) => (
  <Text
    className="font-medium"
    style={[trayDemoText.Body, { color: "#6B6D73" }]}
  >
    {children}
  </Text>
);
