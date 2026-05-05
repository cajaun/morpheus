import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import {
  Tray,
  useTrayFlow,
  useTrayPages,
  type TrayStepDefinition,
} from "@/features/action-tray";
import { AnimatedFlowButton } from "@/features/action-tray/presets/animated-flow-button";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { SymbolView } from "expo-symbols";

const FULLSCREEN_STEP_INDEX = 2;

const OnboardingFooter = () => {
  const { next, back, index, total, close } = useTrayFlow();
  const isFullscreenStep = index === FULLSCREEN_STEP_INDEX;

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <AnimatedFlowButton
        step={index}
        totalSteps={total}
        onNext={next}
        onSecondaryPress={back}
        onFinish={close}
        showSecondary={!isFullscreenStep && index > 0}
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

const OnboardingPageProgressItem = ({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - index), 1);

    return {
      width: interpolate(distance, [0, 1], [42, 22]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        ["#41BBFF", "#DCDDDF"],
      ),
    };
  }, [index, progress]);

  return (
    <Animated.View
      style={[
        {
          height: 4,
          borderRadius: 999,
        },
        animatedStyle,
      ]}
    />
  );
};

const OnboardingPageProgress = ({
  totalPages,
  progress,
}: {
  totalPages: number;
  progress: SharedValue<number>;
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flex: 1,
      }}
    >
      {Array.from({ length: totalPages }, (_, index) => (
        <OnboardingPageProgressItem
          key={index}
          index={index}
          progress={progress}
        />
      ))}
    </View>
  );
};

export const OnboardingPageHeader = () => {
  const { requestClose } = useTrayFlow();
  const { pageIndex, totalPages, backPage, progress } = useTrayPages();
  const { top } = useSafeAreaInsets();
  const isFirstPage = pageIndex === 0;

  return (
    <View
      style={{
        paddingTop: top + 10,
        flexDirection: "column",
        paddingHorizontal: 24,
        gap: 24,
           alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <PressableScale
          onPress={isFirstPage ? requestClose : backPage}
          style={{
            width: 32,
            height: 32,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <SymbolView
            name={"xmark"}
            type="palette"
            size={22}
            weight="semibold"
            tintColor="#2A2A2C"
          />
        </PressableScale>

        <OnboardingPageProgress totalPages={totalPages} progress={progress} />

        <PressableScale
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView
            name="questionmark.circle"
            type="palette"
            size={32}
            tintColor="#2A2A2C"
          />
        </PressableScale>
      </View>

      <View>
        <Text style={trayDemoText.title}>Content Three</Text>
      </View>
    </View>
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
      <Tray.Pages.Header>
        <OnboardingPageHeader />
      </Tray.Pages.Header>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1, gap: 24 }}>
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

          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Atque,
            esse blanditiis. Est ipsum temporibus quis esse dolores similique
            amet doloribus adipisci modi ullam rerum itaque tempore perferendis
            id unde aperiam libero facilis, repellendus tempora velit. Dolores
            iste ipsam molestiae harum?
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

      <Tray.Page className="flex-1">
        <Tray.Body style={{ paddingHorizontal: 40, flex: 1 }}>
          <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
            Content Three D
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            This is the fourth fullscreen page in the onboarding sequence.
          </Text>
          <Text
            className="text-black font-sf-regular"
            style={trayDemoText.bodyLarge}
          >
            The progress indicator should now show four items and keep the
            active page emphasized as you continue through the flow.
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
