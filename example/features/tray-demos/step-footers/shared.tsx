import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import {
  Tray,
  useTrayNavigation,
  useTrayNavigationState,
} from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";

// Back on later steps, close on the first.
export const StepFooterHeader = ({ title }: { title: string }) => {
  const { close, back } = useTrayNavigation();
  const { index } = useTrayNavigationState();
  const icon = index > 0 ? "chevron.left" : "xmark";

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={
          <Tray.HeaderButton onPress={index > 0 ? back : close}>
            <SymbolView
              name={icon}
              type="palette"
              tintColor="#787878"
              size={TRAY_HEADER_CLOSE_ICON_SIZE}
              weight="semibold"
            />
          </Tray.HeaderButton>
        }
      >
        <Text className="font-semibold" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

// The Aave tray's header: the first step closes from the right; later steps
// go back from the left (and have no close button). Which kind a step has is
// fixed per step (`first`), not read from the live step index: every step's
// header re-renders when the index changes, so the leaving header would
// switch its buttons before the transition and nothing would animate.
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
