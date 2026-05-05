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
    <Tray.Footer style={{ width: "100%" }}>
      <AnimatedFlowButton
        step={index}
        totalSteps={total}
        onNext={next}
        onSecondaryPress={back}
        onFinish={close}
      />
    </Tray.Footer>
  );
};

const OnboardingHeader = ({ title }: { title: string }) => {
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
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Reprehenderit
          earum
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
    <Tray.Pages>
    

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
            Content Three A
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
            amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Laborum
            hic ut excepturi, aut eum obcaecati repudiandae! Aliquam expedita,
            minima.
          </Text>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
            Content Three B
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            This is the second fullscreen page. Keep tapping Continue to move
            through the built-in tray pages flow.
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            Quisquam placeat praesentium at delectus veritatis, adipisci sint
            atque deserunt velit rem laborum neque minus doloribus.
          </Text>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
            Content Three C
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            Final fullscreen page before returning to shell and going to Content
            Four.
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            This is some example test that spans over multiple lines bla bla bla
            test test many words. This is a new sentence and we'll see how that
            fares too.
          </Text>
        </Tray.Body>
      </Tray.Page>
    </Tray.Pages>
  );
};

const FourthStep = () => {


  return (
    <Tray.Body>
      <Tray.Section>
        <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
          Last Heading
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
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Laborum hic
          ut excepturi, aut eum obcaecati repudiandae! Aliquam expedita, minima,
          ducimus obcaecati excepturi maiores porro rerum ipsam doloremque error
          numquam omnis.
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
        header: <OnboardingHeader title="Content One" />,
        options: { className: "bg-white" },
      },
      {
        key: "content-two",
        content: <SecondStep />,
        header: <OnboardingHeader title="Content Two" />,
        options: { className: "bg-white" },
      },
      {
        key: "content-three",
        content: <ThirdStep />,
         header: <OnboardingHeader title="Content Three" />,
        options: {
          className: "bg-white",
          fullScreen: true,
          fullScreenSafeAreaTop: true,
          fullScreenDraggable: false,
          fullScreenCloseBehavior: "returnToShell",
        },
      },
      {
        key: "content-four",
         header: <OnboardingHeader title="Content Four" />,
        content: <FourthStep />,
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
