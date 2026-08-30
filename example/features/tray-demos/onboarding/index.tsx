import { Text, View } from "react-native";
import {
  Tray,
  useTrayFlow,
} from "morpheus";
import { BUTTON_HEIGHT } from "@/features/tray-demos/presets/animated-flow-button";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { OnboardingPageHeader as SharedOnboardingPageHeader } from "../shared/onboarding-page-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { SymbolView } from "expo-symbols";
import { CreatingWalletsInfoStep } from "../creating-wallets-info";

const OnboardingFooter = () => {
  const { next, index, total, close, pageIndex } = useTrayFlow();
  const handlePrimaryPress = index >= total - 1 ? close : next;
  const shouldOpenNestedInfo = index === 2 && pageIndex === 1;

  return (
    <Tray.Footer style={{ width: "100%" }}>
      {shouldOpenNestedInfo ? (
        <Tray.Nested
          stepOptions={{
            className: "bg-white",
            footerStyle: ONBOARDING_FOOTER_STYLE,
          }}
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
          <Tray.Step>
            <OnboardingContinueTrayContent />
          </Tray.Step>
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



const OnboardingContinueTrayContent = () => {
  const benefits = [
    "Keep your wallet choices together",
    "Return to this step with everything intact",
    "Review the details before you finish",
  ];

      const { close } = useTrayFlow();
  return (
    <Tray.Body>
      <Tray.Header withSeparator={false} style={{ gap: 0 }}>
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
      <Tray.Section
        style={{
          gap: 20,
        paddingTop: 0
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

        <View style={{ gap: 12 }}>
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
            You can return to this step at any time. Nothing has been submitted,
            and you can review everything before you continue.
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

const ONBOARDING_FOOTER_STYLE = { backgroundColor: "#FFFFFF" };

const ONBOARDING_CONTINUE_TRAY_FOOTER = <OnboardingContinueTrayFooter />;

const ONBOARDING_HELP_INFO_COPY = {
  title: "Onboarding Wallets",
  subtitle: "A quick guide to your wallet setup",
  intro:
    "This helper explains how your wallet setup flow works and where to find your saved choices.",
  firstSectionTitle: "Keep your setup together",
  firstSectionBody:
    "Your onboarding choices stay together as you move through the flow, so you can review them without losing context.",
  secondSectionTitle: "Return when you're ready",
  secondSectionBody:
    "Open this guide whenever you need a reminder. The parent onboarding flow stays in place while you read, and you can return when you're ready to continue.",
  buttonLabel: "Got It",
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

const EXPAND_FROM_TRIGGER_TRANSITION = {
  open: "expandFromTrigger",
  close: "collapseToTrigger",
  origin: "fullScreenFooter",
} as const;

const sharedStepOptions = {
  className: "bg-white",
  footerStyle: ONBOARDING_FOOTER_STYLE,
} as const;

export const OnboardingPageHeader = () => {
  return (
    <SharedOnboardingPageHeader
      rightAccessory={
        <Tray.Nested
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Tray.Step>
            <CreatingWalletsInfoStep copy={ONBOARDING_HELP_INFO_COPY} />
          </Tray.Step>
          <SymbolView
            name="questionmark.circle"
            type="palette"
            size={32}
            tintColor="#2A2A2C"
          />
        </Tray.Nested>
      }
    />
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
        <Tray.Body style={{ flex: 1 }}>
          <Tray.Section>
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
              amet doloribus adipisci modi ullam rerum itaque tempore
              perferendis id unde aperiam libero facilis, repellendus tempora
              velit. Dolores iste ipsam molestiae harum?
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{  flex: 1 }}>
          <Tray.Section>
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
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Each page keeps the same structure so the progress indicator is
              easy to follow while the content changes underneath it.
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Take a moment to read through the details before moving on to the
              next part of the onboarding flow.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ flex: 1 }}>
          <Tray.Section>
            <Text className="font-sf-bold" style={trayDemoText.bodyLarge}>
              Content Three C
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Final fullscreen page before returning to shell and going to
              Content Four.
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test many words. This is a new sentence and we'll see how
              that fares too.
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              The extra room on this page gives the shell a more substantial
              content change when the fullscreen pages move from one to the
              next.
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              When you're ready, continue to the final page and review the
              information before returning to the regular tray.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Page>

      <Tray.Page className="flex-1">
        <Tray.Body style={{ flex: 1 }}>
          <Tray.Section>
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
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              This final page closes out the fullscreen portion of onboarding
              and leaves the next action ready at the bottom of the tray.
            </Text>
            <Text
              className="text-black font-sf-regular"
              style={trayDemoText.bodyLarge}
            >
              Review the summary, then continue when the setup looks right.
            </Text>
          </Tray.Section>
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

const BackgroundScalePreview = () => (
  <View
    pointerEvents="none"
    style={{
      position: "absolute",
      top: 28,
      right: 0,
      bottom: 28,
      left: 0,
      borderColor: trayDemoColors.primaryAction,
      borderRadius: 32,
      borderWidth: 3,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        position: "absolute",
        top: -42,
        right: -42,
        backgroundColor: trayDemoColors.primaryAction,
        borderRadius: 999,
        height: 120,
        opacity: 0.22,
        width: 120,
      }}
    />
    <View
      style={{
        position: "absolute",
        bottom: -28,
        left: -28,
        backgroundColor: trayDemoColors.primaryAction,
        borderRadius: 999,
        height: 88,
        opacity: 0.14,
        width: 88,
      }}
    />
    <Text
      className="font-sf-semibold"
      style={{
        color: trayDemoColors.primaryAction,
        fontSize: 14,
        letterSpacing: 1.2,
        padding: 20,
      }}
    >
      BACKGROUND SCALE PREVIEW
    </Text>
  </View>
);

const OnboardingExample = () => {
  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        width: "100%",
      }}
    >
      <BackgroundScalePreview />

      <Tray.Root
        stepOptions={sharedStepOptions}
        footer={<OnboardingFooter />}
      >
        <Tray.Trigger haptics="feedback">
          <ExampleTrigger label="Onboarding" />
        </Tray.Trigger>

        <Tray.Step>
          <OnboardingHeader title="Content One" />
          <FirstStep />
        </Tray.Step>

        <Tray.Step>
          <OnboardingHeader title="Content Two" />
          <SecondStep />
        </Tray.Step>

        <Tray.Step
          options={{
            fullScreen: true,
            shouldScaleBackground: true,
            fullScreenSafeAreaTop: true,
            fullScreenDraggable: false,
            fullScreenCloseBehavior: "returnToShell",
          }}
        >
          <OnboardingPageHeader />
          <ThirdStep />
        </Tray.Step>

        <Tray.Step>
          <OnboardingHeader title="Content Four" />
          <FourthStep />
        </Tray.Step>

      </Tray.Root>
    </View>
  );
};

export default OnboardingExample;
