import type { ReactNode } from "react";
import { Text } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { AnimatedOnboardingButton } from "@/features/tray-demos/presets/content/button";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const AaveFooter = () => {
  const { next, index, total, close, back } = useTrayNavigation();

  return (
    <Tray.Footer style={{ width: "100%", alignItems: "center" }}>
      <AnimatedOnboardingButton
        step={index}
        totalSteps={total}
        onNext={next}
        onFinish={close}
        onSecondaryPress={back}
        primaryColor="#9896FF"
      />
    </Tray.Footer>
  );
};

const AaveBackAction = () => {
  const { back } = useTrayNavigation();

  return (
    <Tray.HeaderButton onPress={back}>
      <SymbolView
        name="chevron.left"
        type="palette"
        tintColor="#787878"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
      />
    </Tray.HeaderButton>
  );
};

const AaveHeader = ({
  title,
  left,
}: {
  title: string;
  left?: ReactNode;
}) => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Header withSeparator>
      <Tray.HeaderRow
        left={left}
        right={
          left == null ? (
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

const AaveExample = () => {
  return (
    <Tray.Root
      stepOptions={{
        className: "bg-white",
        footerStyle: { backgroundColor: "#FFFFFF" },
      }}
      footer={<AaveFooter />}
    >
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Trigger" />
      </Tray.Trigger>

      <Tray.Step>
        <AaveHeader title="Content One" />

        <Tray.Body>
          <Tray.Section>
            <Text className="font-bold" style={trayDemoText.Title2}>
              This is a test title
            </Text>

            <Text
              className="text-black font-normal"
              style={trayDemoText.Title2}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <AaveHeader
          title="Content Two"
          left={<AaveBackAction />}
        />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-bold" style={trayDemoText.Title2}>
              Different heading
            </Text>

            <Text
              className="text-black font-normal"
              style={trayDemoText.Title2}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-normal"
              style={trayDemoText.Title2}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <AaveHeader
          title="Content Three"
          left={<AaveBackAction />}
        />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-bold" style={trayDemoText.Title2}>
              Another heading
            </Text>

            <Text
              className="text-black font-normal"
              style={trayDemoText.Title2}
            >
              Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-normal"
              style={trayDemoText.Title2}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

    
    </Tray.Root>
  );
};

export default AaveExample;
