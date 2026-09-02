import { Text, View } from "react-native";
import { Tray, useTrayFlow } from "morpheus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trayDemoColors, trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";
import FlowHeader from "../presets/flow-header";
import { OnboardingPageHeader } from "../onboarding";

const quickStepOptions = {
  className: "bg-white",
  footerStyle: { backgroundColor: "transparent" },
} as const;

const QuickOnboardingFooter = () => {
  const { close, next, index, total } = useTrayFlow();
  const isLastStep = index === total - 1;

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <PrimaryButton
        label={isLastStep ? "Finish" : "Continue"}
        onPress={isLastStep ? close : next}
      />
    </Tray.Footer>
  );
};

const QuickSheetHeader = ({ title }: { title: string }) => {
  const { close, index, back } = useTrayFlow();

  return (
    <Tray.Header withSeparator>
      <FlowHeader
        leftLabel={title}
        onBack={index > 0 ? back : undefined}
        onClose={close}
        shouldClose
        step={index}
      />
    </Tray.Header>
  );
};

const QuickManualTrayStep = () => {
  const { close } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Section style={{ gap: 16 }}>
        <Text className="font-sf-bold" style={trayDemoText.title}>
          Create manually
        </Text>
        <Text className="font-sf-regular" style={trayDemoText.bodyLarge}>
          This nested tray is opened from the manual setup action in the
          fullscreen step.
        </Text>
        <PrimaryButton label="Done" onPress={close} />
      </Tray.Section>
    </Tray.Body>
  );
};

const CreateManuallyDivider = () => (
  <View
    style={{
      alignItems: "center",
      flexDirection: "row",
      gap: 18,
      width: "100%",
    }}
  >
    <View
      style={{
        borderColor: "#e8e8e8",
        borderStyle: "dashed",
        borderTopWidth: 2,
        flex: 1,
      }}
    />
    <Text
      className="font-sf-medium"
      style={{
        color: trayDemoColors.mutedText,
        fontSize: 19,
        lineHeight: 34,
        textAlign: "center",
      }}
    >
      or create manually
    </Text>
    <View
      style={{
        borderColor: "#e8e8e8",
        borderStyle: "dashed",
        borderTopWidth: 2,
        flex: 1,
      }}
    />
  </View>
);

const QuickOnboarding = () => {
  const { bottom } = useSafeAreaInsets();

  return (
    <Tray.Root
      stepOptions={quickStepOptions}
      footer={<QuickOnboardingFooter />}
    >
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Quick Onboarding" />
      </Tray.Trigger>

      <Tray.Step key="quick-entry">
        <QuickSheetHeader title="Quick setup" />
        <Tray.Body>
          <Tray.Section style={{ gap: 16 }}>
            <Text className="font-sf-bold" style={trayDemoText.title}>
              Start your setup
            </Text>
            <Text className="font-sf-regular" style={trayDemoText.bodyLarge}>
              This first step stays in the tray. Continue to move into the full
              screen part of the flow.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Step>

      <Tray.Step
        options={{
          fullScreen: true,
          fullScreenCloseBehavior: "returnToShell",
          fullScreenDraggable: false,
          fullScreenSafeAreaTop: true,
          shouldScaleBackground: true,
        }}
      >
        <OnboardingPageHeader />
        <Tray.Pages>
          <Tray.Page className="flex-1">
            <Tray.Body className="flex-1">
              <Tray.Section className="flex-1 gap-4">
                <View className="gap-4">
                  <Text className="font-sf-bold" style={trayDemoText.title}>
                    Full screen step
                  </Text>
                  <Text
                    className="font-sf-regular"
                    style={trayDemoText.bodyLarge}
                  >
                    Continue through the full screen flow, or choose manual
                    setup below.
                  </Text>
                </View>
                <Tray.Nested
                  stepOptions={quickStepOptions}
                  style={{
                    marginBottom: bottom,
                    marginTop: "auto",
                    width: "100%",
                  }}
                >
                  <CreateManuallyDivider />
                  <Tray.Step>
                    <QuickManualTrayStep />
                  </Tray.Step>
                </Tray.Nested>
              </Tray.Section>
            </Tray.Body>
          </Tray.Page>
        </Tray.Pages>
      </Tray.Step>
    </Tray.Root>
  );
};

export default QuickOnboarding;
