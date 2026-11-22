import { Text, View, useWindowDimensions } from "react-native";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { OnboardingPageHeader } from "../shared/onboarding-page-header";
import { PrimaryButton } from "../shared/primary-button";
import { AaveStyleStepHeader, DemoCard, DemoCopy } from "./shared";

const FULL_SCREEN_OPTIONS = {
  fullScreen: true,
  shouldScaleBackground: false,
  fullScreenSafeAreaTop: true,
  fullScreenDraggable: false,
  fullScreenCloseBehavior: "returnToShell",
} as const;

export const NextButton = ({ label }: { label: string }) => {
  const { next } = useTrayNavigation();

  return <PrimaryButton label={label} onPress={next} />;
};

const FullScreenCard = ({
  color,
  title,
  copy,
}: {
  color: string;
  title: string;
  copy?: string;
}) => {
  const { height } = useWindowDimensions();

  return (
    <Tray.Body style={{ flex: 1 }}>
      <Tray.Section style={{ gap: 16 }}>
        <View
          style={{
            height: Math.round(height * 0.5),
            borderRadius: 28,
            backgroundColor: color,
            justifyContent: "flex-end",
            padding: 24,
          }}
        >
          <Text className="font-semibold" style={trayDemoText.Title1}>
            {title}
          </Text>
        </View>
        {copy ? <DemoCopy>{copy}</DemoCopy> : null}
      </Tray.Section>
    </Tray.Body>
  );
};

const FooterFullScreenTray = () => (
  <Tray.Root stepOptions={{ className: "bg-white" }}>
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Footer Fullscreen" />
    </Tray.Trigger>

    <Tray.Step key="footer-full-sheet">
      <AaveStyleStepHeader title="Sheet" first />
      <Tray.Body>
        <Tray.Section style={{ gap: 16 }}>
          <DemoCard
            height={160}
            color="#DDF5FF"
            tint="#09B6F4"
            icon="rectangle.expand.vertical"
          />
        </Tray.Section>
      </Tray.Body>
      <Tray.Footer>
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-full-one" options={FULL_SCREEN_OPTIONS}>
      <OnboardingPageHeader />
      
      <Tray.Pages>
        <Tray.Page className="flex-1">
          <FullScreenCard color="#FFE9DD" title="Same footer" />
        </Tray.Page>
        <Tray.Page className="flex-1">
          <FullScreenCard
            color="#FFF3D6"
            title="Still the same footer"
            copy="Swipe between pages, the footer stays put."
          />
        </Tray.Page>
      </Tray.Pages>
      <Tray.Footer>
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-full-two" options={FULL_SCREEN_OPTIONS}>
      <OnboardingPageHeader />

      <Tray.Pages>
        <Tray.Page className="flex-1">
          <FullScreenCard
            color="#E4F8E9"
            title="Footer gone"
            copy="The footer left with the previous step. Go back to bring it in."
          />
        </Tray.Page>
        <Tray.Page className="flex-1">
          <FullScreenCard color="#E8F1FF" title="Another page" />
        </Tray.Page>
      </Tray.Pages>
    </Tray.Step>
  </Tray.Root>
);

export default FooterFullScreenTray;
