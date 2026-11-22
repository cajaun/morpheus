import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import {
  Tray,
  useTrayNavigation,
  useTrayNavigationState,
} from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";

// Every step measures to exactly the same height: a fixed-height card, one
// line of copy and one button. The tray's height never changes between steps,
// so this exercises step changes that have no resize animation. The titles
// differ in length so the header title still has to slide between steps.
const CARD_HEIGHT = 200;

const STEPS = [
  {
    key: "equal-one",
    title: "One",
    color: "#DDF5FF",
    tint: "#09B6F4",
    icon: "1.circle.fill",
    copy: "Same height as every other step.",
  },
  {
    key: "equal-two",
    title: "A much longer title",
    color: "#FFE9DD",
    tint: "#FF7A2F",
    icon: "2.circle.fill",
    copy: "No resize happens on the way here.",
  },
  {
    key: "equal-three",
    title: "Three",
    color: "#E4F8E9",
    tint: "#22C766",
    icon: "3.circle.fill",
    copy: "Back and forth should stay smooth.",
  },
] as const;

const EqualHeightsHeader = ({ title }: { title: string }) => {
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

const EqualHeightsStep = ({
  color,
  tint,
  icon,
  copy,
  last,
}: {
  color: string;
  tint: string;
  icon: (typeof STEPS)[number]["icon"];
  copy: string;
  last: boolean;
}) => {
  const { next, close } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section style={{ gap: 16 }}>
        <View
          style={{
            height: CARD_HEIGHT,
            borderRadius: 24,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView name={icon} tintColor={tint} size={72} weight="bold" />
        </View>
        <Text
          numberOfLines={1}
          className="font-medium"
          style={[trayDemoText.Body, { color: "#6B6D73" }]}
        >
          {copy}
        </Text>
        <PrimaryButton label={last ? "Done" : "Next"} onPress={last ? close : next} />
      </Tray.Section>
    </Tray.Body>
  );
};

const EqualHeightsTray = () => (
  <Tray.Root stepOptions={{ className: "bg-white" }}>
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Equal Heights" />
    </Tray.Trigger>

    {STEPS.map((step, index) => (
      <Tray.Step key={step.key}>
        <EqualHeightsHeader title={step.title} />
        <EqualHeightsStep
          color={step.color}
          tint={step.tint}
          icon={step.icon}
          copy={step.copy}
          last={index === STEPS.length - 1}
        />
      </Tray.Step>
    ))}
  </Tray.Root>
);

export default EqualHeightsTray;
