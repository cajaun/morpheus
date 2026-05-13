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
import { BUTTON_HEIGHT } from "@/features/action-tray/presets/animated-flow-button";
import FlowHeader from "@/features/action-tray/presets/flow-header";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { SymbolView } from "expo-symbols";
import { createCreatingWalletsInfoSteps } from "../creating-wallets-info";



const OnboardingFooter = () => {
  const { next, index, total, close, pageIndex } = useTrayFlow();
  const handlePrimaryPress = index >= total - 1 ? close : next;
  const shouldOpenNestedInfo = index === 2 && pageIndex === 1;

  return (
    <Tray.Footer style={{ width: "100%" }}>
      {shouldOpenNestedInfo ? (
        <Tray.Nested
          steps={ONBOARDING_CONTINUE_TRAY_STEPS}
          footer={ONBOARDING_CONTINUE_TRAY_FOOTER}
          transition={EXPAND_FROM_TRIGGER_TRANSITION}
          style={{
            alignItems: "center",
            backgroundColor: trayDemoColors.primaryAction,
            borderRadius: 50,
            height: BUTTON_HEIGHT,
            justifyContent: "center",
            paddingHorizontal: 20,
            width: "100%",
          }}
        >
          <ContinueButtonLabel />
        </Tray.Nested>
      ) : (
        <PressableScale
          onPress={handlePrimaryPress}
          style={{
            alignItems: "center",
            backgroundColor: trayDemoColors.primaryAction,
            borderRadius: 50,
            height: BUTTON_HEIGHT,
            justifyContent: "center",
            paddingHorizontal: 20,
            width: "100%",
          }}
        >
          <ContinueButtonLabel />
        </PressableScale>
      )}
    </Tray.Footer>
  );
};

const ContinueButtonLabel = () => (
  <Text className="text-white font-sf-bold" style={trayDemoText.button}>
    Continue
  </Text>
);

const OnboardingContinueTrayHeader = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Header style={{ gap: 0 }}>
      <View style={{ alignItems: "flex-end" }}>
        <PressableScale
          onPress={close}
          style={{
            alignItems: "center",
            backgroundColor: trayDemoColors.fieldBackground,
            borderRadius: 999,
            height: 32,
            justifyContent: "center",
            width: 32,
          }}
        >
          <SymbolView
            name="xmark"
            type="palette"
            size={16}
            weight="semibold"
            tintColor="#2A2A2C"
          />
        </PressableScale>
      </View>
    </Tray.Header>
  );
};

const OnboardingContinueTrayContent = () => {
  const benefits = [
    "Keep your wallet setup choices together",
    "Return to this onboarding step with context",
    "Finish the flow when everything looks right",
  ];

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <Tray.Section
        style={{
          gap: 20,
          paddingHorizontal: 28,
          paddingVertical: 0,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#EEF8FF",
            borderRadius: 30,
            height: 60,
            justifyContent: "center",
            width: 60,
          }}
        >
          <SymbolView
            name="checkmark.circle.fill"
            type="palette"
            size={32}
            tintColor={trayDemoColors.primaryAction}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Text
            className="font-sf-bold"
            style={{
              color: trayDemoColors.headingText,
              fontSize: 28,
              letterSpacing: 0.2,
              lineHeight: 34,
            }}
          >
            Save your setup
          </Text>
          <Text
            className="font-sf-medium"
            style={{
              color: trayDemoColors.mutedText,
              fontSize: 18,
              letterSpacing: 0.2,
              lineHeight: 26,
            }}
          >
            Keep your onboarding choices ready while you finish setting up your
            wallet experience.
          </Text>
          <Text
            className="font-sf-medium"
            style={{
              color: trayDemoColors.mutedText,
              fontSize: 18,
              letterSpacing: 0.2,
              lineHeight: 26,
            }}
          >
            We will keep this step tidy so you can come back to it without
            losing the thread. Nothing is submitted yet, and you can still
            review the details before moving on.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {benefits.map((benefit) => (
            <View
              key={benefit}
              style={{
                alignItems: "flex-start",
                flexDirection: "row",
                gap: 10,
              }}
            >
              <SymbolView
                name="checkmark.circle.fill"
                type="palette"
                size={20}
                tintColor={trayDemoColors.primaryAction}
              />
              <Text
                className="font-sf-medium"
                style={{
                  color: trayDemoColors.mutedText,
                  flex: 1,
                  fontSize: 17,
                  letterSpacing: 0.15,
                  lineHeight: 24,
                }}
              >
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        
      </Tray.Section>
    </Tray.Body>
  );
};

const OnboardingContinueTrayFooter = () => {
  const { closeAndNextParentPage } = useTrayFlow();

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <PressableScale
        onPress={closeAndNextParentPage}
        style={{
          alignItems: "center",
          backgroundColor: trayDemoColors.primaryAction,
          borderRadius: 50,
          height: BUTTON_HEIGHT,
          justifyContent: "center",
          paddingHorizontal: 20,
          width: "100%",
        }}
      >
        <ContinueButtonLabel />
      </PressableScale>
    </Tray.Footer>
  );
};

const ONBOARDING_CONTINUE_TRAY_STEPS: TrayStepDefinition[] = [
  {
    key: "save-setup",
    header: <OnboardingContinueTrayHeader />,
    content: <OnboardingContinueTrayContent />,
    options: {
      className: "bg-white",
      footerStyle: { backgroundColor: trayDemoColors.white },
    },
  },
];
const ONBOARDING_CONTINUE_TRAY_FOOTER = <OnboardingContinueTrayFooter />;

const ONBOARDING_HELP_INFO_STEPS = createCreatingWalletsInfoSteps({
  title: "Onboarding Wallets",
  subtitle: "Tiny nonsense for the fullscreen flow",
  intro:
    "This onboarding helper is reusing the Creating Wallets tray, but the words are intentionally dummy test copy. The tray pops up from the fullscreen step, says a few onboarding-ish things, and then politely gets out of the way.",
  firstSectionTitle: "Why this appears here",
  firstSectionBody:
    "Imagine the user is midway through onboarding and taps the question mark because the vibes are confusing. Blah blah wallet setup, onboarding rails, safe little explanations, banana protocol, tap continue when the clouds align.",
  secondSectionTitle: "What happens next",
  secondSectionBody:
    "Nothing too serious. The parent onboarding tray should stay exactly where it was, the nested tray should animate like a normal tray, and this gibberish should prove the reusable copy path works without replacing the original demo.",
  buttonLabel: "Cool",
});

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

const EXPAND_FROM_TRIGGER_TRANSITION = {
  open: "expandFromTrigger",
  close: "collapseToTrigger",
  origin: "fullScreenFooter",
} as const;

const sharedStepOptions = {
  className: "bg-white",
} as const;

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
    // <View
    //   style={{
    //     paddingTop: top + 10,
    //     flexDirection: "column",

    //     gap: 24,
    //        alignItems: "center",
    //   }}
    // >
    <View
      style={{
        paddingTop: 24,
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

      <Tray.Nested
        steps={ONBOARDING_HELP_INFO_STEPS}
        style={{
          width: 32,
          height: 32,
      
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
      </Tray.Nested>
    </View>

    // </View>
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
      <Tray.Pages.Header shell>
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
        options: sharedStepOptions,
      },
      {
        key: "content-two",
        content: <SecondStep />,
        header: <OnboardingHeader title="Content Two" />,
        options: sharedStepOptions,
      },
      {
        key: "content-three",
        content: <ThirdStep />,
        header: <OnboardingPageHeader />,
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
        options: sharedStepOptions,
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
