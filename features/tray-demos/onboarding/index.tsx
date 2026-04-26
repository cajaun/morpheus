import React, { useMemo } from "react";
import { Text } from "react-native";
import {
  Tray,
  useTrayFlow,
  type TrayStepDefinition,
} from "@/features/action-tray";
import { AnimatedFlowButton } from "@/features/action-tray/presets/animated-flow-button";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const OnboardingFooter = () => {
  const { next, back, index, total, close } = useTrayFlow();

  return (
    <AnimatedFlowButton
      step={index}
      totalSteps={total}
      onNext={next}
      onSecondaryPress={back}
      onFinish={close}
    />
  );
};

const FirstStep = () => {
  const { close, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Content One"
          shouldClose
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section>
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          This is a test 
        </Text>

        <Text
          className="text-black font-sf-medium"
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
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Content Two"
          shouldClose
          onBack={back}
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section >
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          Different heading
        </Text>

        <Text
          className="text-black font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
          amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
          dolor amet. Lorem ipsum dolor amet.
        </Text>

        <Text
          className="text-black font-sf-medium"
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
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Header withSeparator>
        <FlowHeader
          step={index}
          leftLabel="Content Three"
          shouldClose
          onBack={back}
          onClose={close}
        />
      </Tray.Header>

      <Tray.Section>
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          Another heading
        </Text>

        <Text
          className="text-black font-sf-medium"
          style={trayDemoText.bodyLarge}
        >
          Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum dolor
          amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
        </Text>

        <Text
          className="text-black font-sf-medium"
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

const OnboardingExample = () => {
  const steps = useMemo<TrayStepDefinition[]>(
    () => [
      {
        key: "content-one",
        content: <FirstStep />,
        options: { className: "bg-white" },
      },
      {
        key: "content-two",
        content: <SecondStep />,
        options: { className: "bg-white" },
      },
      {
        key: "content-three",
        content: <ThirdStep />,
        options: { className: "bg-white" },
      },
    ],
    [],
  );
  const footer = useMemo(() => <OnboardingFooter />, []);

  return (
    <Tray.Root steps={steps} footer={footer}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Onboarding" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default OnboardingExample;
