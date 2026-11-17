import type { ReactNode } from "react";
import { Text, View } from "react-native";
import {
  Tray,
  useTrayNavigation,
  useTrayNavigationState,
} from "react-native-morpheus";
import {
  TRAY_HEADER_CLOSE_BUTTON_SIZE,
  TRAY_HEADER_CLOSE_ICON_SIZE,
} from "react-native-morpheus/constants";
import { BUTTON_HEIGHT } from "@/features/tray-demos/presets/animated-flow-button";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { OnboardingPageHeader as SharedOnboardingPageHeader } from "../shared/onboarding-page-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { SymbolView } from "expo-symbols";
import { PrimaryButton } from "../shared/primary-button";

const ONBOARDING_INFO_ICON = "rgba(255,255,255,0.24)";

const OnboardingFooter = () => {
  const { index, total, pageIndex } = useTrayNavigationState();
  const { close, next } = useTrayNavigation();
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
  <Text className="text-white font-bold" style={trayDemoText.Button}>
    Continue
  </Text>
);

const OnboardingContinueTrayContent = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 28,
          paddingTop: 24,
        }}
      >
        <View
          style={{
            alignItems: "flex-start",
            height: 68,
            justifyContent: "center",
            width: 68,
          }}
        >
          <SymbolView
            name="checkmark.icloud"
            size={64}
            tintColor={trayDemoColors.mutedText}
            weight="thin"
          />
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <PressableScale
            onPress={close}
            style={{
              alignItems: "center",
              backgroundColor: trayDemoColors.fieldBackground,
              borderRadius: 999,
              height: 36,
              justifyContent: "center",
              width: 36,
            }}
          >
            <SymbolView
              name="xmark"
              size={18}
              weight="bold"
              tintColor={trayDemoColors.mutedText}
            />
          </PressableScale>
        </View>
      </View>

      <Tray.Section
        style={{
          gap: 12,
          paddingHorizontal: 28,
        }}
      >
        <Text
          className="font-semibold"
          style={{
            color: trayDemoColors.headingText,
            fontSize: 28,
            letterSpacing: 0.1,
            lineHeight: 31,
          }}
        >
          Your setup is saved
        </Text>

        <View style={{ gap: 12 }}>
          <Text
            className="font-medium"
            style={{
              color: trayDemoColors.mutedText,
              fontSize: 20,
              letterSpacing: 0.1,
              lineHeight: 28,
            }}
          >
            Your wallet choices stay together as you move through onboarding.
            Nothing is submitted yet, so you can still make changes.
          </Text>

          <Text
            className="font-medium"
            style={{
              color: trayDemoColors.mutedText,
              fontSize: 20,
              letterSpacing: 0.1,
              lineHeight: 28,
            }}
          >
            You can return to this flow at any time to review your choices
            before you finish. When everything looks right, continue to the next
            step.
          </Text>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const OnboardingContinueTrayFooter = () => {
  const { closeAndNextParentPage } = useTrayNavigation();

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <View style={{ width: "100%" }}>
        <PressableScale
          onPress={closeAndNextParentPage}
          style={{
            alignItems: "center",
            backgroundColor: trayDemoColors.primaryAction,
            borderRadius: 50,
            height: 50,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Text className="text-white font-bold" style={trayDemoText.Button}>
            Continue
          </Text>
        </PressableScale>
      </View>
    </Tray.Footer>
  );
};

const ONBOARDING_FOOTER_STYLE = {
  backgroundColor: trayDemoColors.white,
};

const ONBOARDING_CONTINUE_TRAY_FOOTER = <OnboardingContinueTrayFooter />;

const OnboardingWalletsInfoStep = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Body style={{ paddingHorizontal: 0 }}>
      <Tray.Section style={{ gap: 20, paddingTop: 0 }}>
        <View
          style={{
            backgroundColor: trayDemoColors.white,
            borderRadius: 34,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: trayDemoColors.primaryAction,
              justifyContent: "flex-end",
              minHeight: 200,
              paddingBottom: 24,
              paddingHorizontal: 28,
              paddingTop: 28,
            }}
          >
            <View style={{ position: "absolute", left: 24, top: 18 }}>
              <SymbolView
                name="text.document.fill"
                tintColor={ONBOARDING_INFO_ICON}
                size={120}
              />
            </View>

            <PressableScale
              onPress={close}
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.22)",
                borderRadius: 17,
                height: 34,
                justifyContent: "center",
                position: "absolute",
                right: 20,
                top: 20,
                width: 34,
              }}
            >
              <SymbolView
                name="xmark"
                type="palette"
                size={17}
                tintColor={trayDemoColors.white}
                weight="bold"
              />
            </PressableScale>

            <View style={{ gap: 2 }}>
              <Text
                className="font-semibold text-white"
                style={{
                  fontSize: 28,
                  letterSpacing: 0.3,
                  lineHeight: 34,
                }}
              >
                Onboarding guide
              </Text>
              <Text
                className="font-medium"
                style={{
                  color: trayDemoColors.white,
                  fontSize: 18,
                  letterSpacing: 0.2,
                  lineHeight: 24,
                }}
              >
                A quick look at this flow
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 28, paddingTop: 24 }}>
            <Text
              className="font-medium"
              style={{
                color: trayDemoColors.mutedText,
                fontSize: 21,
                letterSpacing: 0.2,
                lineHeight: 28,
              }}
            >
              Your onboarding flow keeps your choices together as you move
              between steps. This makes it easier to review each decision, keep
              track of where you are, and return to an earlier page without
              losing your place. It can also help you take your time, compare
              the details, and finish your setup when everything looks right. At
              each step, you can pause, go back, or continue when you are ready.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, width: "100%" }}>
          <PrimaryButton
            backgroundColor={trayDemoColors.primaryAction}
            label="Got It"
            onPress={close}
          />
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const OnboardingBackAction = () => {
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

const OnboardingHeader = ({
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
        <Text className="font-semibold" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
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
          stepOptions={{ className: "bg-white" }}
          style={{
            width: TRAY_HEADER_CLOSE_BUTTON_SIZE,
            height: TRAY_HEADER_CLOSE_BUTTON_SIZE,
            borderRadius: TRAY_HEADER_CLOSE_BUTTON_SIZE / 2,
            backgroundColor: "#F2F2F2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Tray.Step>
            <OnboardingWalletsInfoStep />
          </Tray.Step>
          <SymbolView
            name="questionmark"
            type="palette"
            size={TRAY_HEADER_CLOSE_ICON_SIZE}
            tintColor="#787878"
            weight="bold"
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
        <Text className="font-semibold" style={trayDemoText.Title2}>
          This is a test title
        </Text>

        <Text
          className="text-[#7F7F7F] font-medium"
          style={trayDemoText.Title3}
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
        <Text className="font-semibold" style={trayDemoText.Title2}>
          Different heading
        </Text>

        <Text
          className="text-[#7F7F7F] font-medium"
          style={trayDemoText.Title3}
        >
          Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
          amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
          dolor amet. Lorem ipsum dolor amet.
        </Text>

        <Text
          className="text-[#7F7F7F] font-medium"
          style={trayDemoText.Title3}
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
            <Text className="font-semibold" style={trayDemoText.LargeTitle}>
              Content Three A
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Laborum
              hic ut excepturi, aut eum obcaecati repudiandae! Aliquam expedita,
              minima.
            </Text>

            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
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
        <Tray.Body style={{ flex: 1 }}>
          <Tray.Section>
            <Text className="font-semibold" style={trayDemoText.LargeTitle}>
              Content Three B
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              This is the second fullscreen page. Keep tapping Continue to move
              through the built-in tray pages flow.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              Quisquam placeat praesentium at delectus veritatis, adipisci sint
              atque deserunt velit rem laborum neque minus doloribus.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              Each page keeps the same structure so the progress indicator is
              easy to follow while the content changes underneath it.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
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
            <Text className="font-semibold" style={trayDemoText.LargeTitle}>
              Content Three C
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              Final fullscreen page before returning to shell and going to
              Content Four.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test many words. This is a new sentence and we'll see how
              that fares too.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              The extra room on this page gives the shell a more substantial
              content change when the fullscreen pages move from one to the
              next.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
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
            <Text className="font-semibold" style={trayDemoText.LargeTitle}>
              Content Three D
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              This is the fourth fullscreen page in the onboarding sequence.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              The progress indicator should now show four items and keep the
              active page emphasized as you continue through the flow.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
            >
              This final page closes out the fullscreen portion of onboarding
              and leaves the next action ready at the bottom of the tray.
            </Text>
            <Text
              className="text-[#7F7F7F] font-medium"
              style={trayDemoText.Title3}
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
        <Text className="font-semibold" style={trayDemoText.Title2}>
          Last Heading
        </Text>

        <Text
          className="text-[#7F7F7F] font-medium"
          style={trayDemoText.Title3}
        >
          Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
          amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
          dolor amet. Lorem ipsum dolor amet.
        </Text>

        <Text
          className="text-[#7F7F7F] font-medium"
          style={trayDemoText.Title3}
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
      className="font-semibold"
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

      <Tray.Root stepOptions={sharedStepOptions} footer={<OnboardingFooter />}>
        <Tray.Trigger haptics="feedback">
          <ExampleTrigger label="Onboarding" />
        </Tray.Trigger>

        <Tray.Step>
          <OnboardingHeader title="Content One" />
          <FirstStep />
        </Tray.Step>

        <Tray.Step>
          <OnboardingHeader
            title="Content Two"
            left={<OnboardingBackAction />}
          />
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
          <OnboardingHeader
            title="Content Four"
            left={<OnboardingBackAction />}
          />
          <FourthStep />
        </Tray.Step>
      </Tray.Root>
    </View>
  );
};

export default OnboardingExample;
