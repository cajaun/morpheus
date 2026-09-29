import type { ReactNode } from "react";
import { Text } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tray, useTrayFlow } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { AnimatedOnboardingButton } from "@/features/tray-demos/presets/content/button";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const AaveFooter = () => {
  const { next, index, total, close, back } = useTrayFlow();

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

const AaveReturnButton = () => {
  const { back } = useTrayFlow();

  return (
    <Tray.HeaderCloseButton onPress={back}>
      <SymbolView
        name="chevron.left"
        type="palette"
        tintColor="#787878"
        size={TRAY_HEADER_CLOSE_ICON_SIZE}
        weight="semibold"
      />
    </Tray.HeaderCloseButton>
  );
};

const AaveHeader = ({
  title,
  returnButton,
}: {
  title: string;
  returnButton?: ReactNode;
}) => {
  const { close } = useTrayFlow();

  return (
    <Tray.Header withSeparator returnButton={returnButton}>
      <Tray.HeaderRow>
        <Text className="font-semibold text-black" style={trayDemoText.Title1}>
          {title}
        </Text>

        <Tray.HeaderCloseButton onPress={close}>
          <SymbolView
            name="xmark"
            type="palette"
            tintColor="#787878"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            weight="bold"
          />
        </Tray.HeaderCloseButton>
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
          returnButton={<AaveReturnButton />}
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
          returnButton={<AaveReturnButton />}
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

      <Tray.Step>
        <AaveHeader
          title="Content Four"
          returnButton={<AaveReturnButton />}
        />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-bold" style={trayDemoText.Title2}>
              Some heading
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
    </Tray.Root>
  );
};

export default AaveExample;
