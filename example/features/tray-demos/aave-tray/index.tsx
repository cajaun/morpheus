import { Text } from "react-native";
import { Tray, useTrayFlow } from "morpheus";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
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

const AaveHeader = ({ title }: { title: string }) => {
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Header withSeparator>
      <FlowHeader
        step={index}
        leftLabel={title}
        shouldClose
        onClose={close}
        onBack={index > 0 ? back : undefined}
      />
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
            <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
              This is a test title
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <AaveHeader title="Content Two" />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
              Different heading
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <AaveHeader title="Content Three" />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
              Another heading
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step>
        <AaveHeader title="Content Four" />
        <Tray.Body>
          <Tray.Section>
            <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
              Some heading
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
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
