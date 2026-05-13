import React, { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { AnimatedOnboardingButton } from "@/features/action-tray/presets/content/button";
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

const sharedStepOptions = {
  className: "bg-white",
} as const;

const FirstStep = () => {
  return (
    <Tray.Body>
      <Tray.Section>
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          This is a test title
        </Text>

        <Text
          className="text-black font-sf-regular"
          style={trayDemoText.bodyLarge}
        >
          This is some example test that spans over multiple lines bla bla bla
          test test test many wods. this is a new sentence and we'll see how
          that fares too.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const SecondStep = () => {
  return (
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
          This is some example test that spans over multiple lines bla bla bla
          test test test many wods. this is a new sentence and we'll see how
          that fares too.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const ThirdStep = () => {
  return (
    <Tray.Body>
      <Tray.Section>
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          Another heading
        </Text>

        <Text
          className="text-black font-sf-regular"
          style={trayDemoText.bodyLarge}
        >
         Lorem ipsum dolor amet. Lorem ipsum dolor
          amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
          dolor amet. 
        </Text>

        <Text
          className="text-black font-sf-regular"
          style={trayDemoText.bodyLarge}
        >
               This is some example test that spans over multiple lines bla bla bla
          test test test many wods. this is a new sentence and we'll see how
          that fares too.
        </Text>
      </Tray.Section>
    </Tray.Body>
  );
};

const AaveExample = () => {
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "content-one",
        content: <FirstStep />,
        header: <AaveHeader title="Content One" />,
        options: sharedStepOptions,
      },
      {
        key: "content-two",
        content: <SecondStep />,
        header: <AaveHeader title="Content Two" />,
        options: sharedStepOptions,
      },
      {
        key: "content-three",
        content: <ThirdStep />,
        header: <AaveHeader title="Content Three" />,
        options: sharedStepOptions,
      },
    ],
    [],
  );
  const footer = useMemo(() => <AaveFooter />, []);

  return (
    <Tray.Root steps={steps} footer={footer}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Aave" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default AaveExample;
