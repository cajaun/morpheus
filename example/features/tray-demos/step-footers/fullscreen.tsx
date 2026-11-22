import { Text, View, useWindowDimensions } from "react-native";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { trayDemoText } from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";
import { DemoCard, DemoCopy, StepFooterHeader } from "./shared";

const FULL_SCREEN_OPTIONS = {
  fullScreen: true,
  shouldScaleBackground: false,
  fullScreenSafeAreaTop: true,
  fullScreenDraggable: false,
} as const;

export const NextButton = ({ label }: { label: string }) => {
  const { next } = useTrayNavigation();

  return <PrimaryButton label={label} onPress={next} />;
};

const FullScreenBody = ({
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
    <Tray.Body fullScreen style={{ paddingTop: 0 }}>
      <View style={{ gap: 16 }}>
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
      </View>
    </Tray.Body>
  );
};

const FooterFullScreenTray = () => (
  <Tray.Root stepOptions={{ className: "bg-white" }}>
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Footer Fullscreen" />
    </Tray.Trigger>

    <Tray.Step key="footer-full-sheet">
      <StepFooterHeader title="Sheet" />
      <Tray.Body>
        <Tray.Section style={{ gap: 16 }}>
          <DemoCard height={160} color="#DDF5FF" tint="#09B6F4" icon="rectangle.expand.vertical" />
        </Tray.Section>
      </Tray.Body>
      <Tray.Footer>
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-full-one" options={FULL_SCREEN_OPTIONS}>
      <StepFooterHeader title="Fullscreen" />
      <FullScreenBody
        color="#FFE9DD"
        title="Same footer"

      />
      <Tray.Footer>
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-full-two" options={FULL_SCREEN_OPTIONS}>
      <StepFooterHeader title="No footer" />
      <FullScreenBody
        color="#E4F8E9"
        title="Footer gone"
        copy="The footer left with the previous step. Go back to bring it in."
      />
    </Tray.Step>
  </Tray.Root>
);

export default FooterFullScreenTray;
