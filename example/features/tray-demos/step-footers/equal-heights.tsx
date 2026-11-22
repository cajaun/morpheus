import { Tray, useTrayNavigation } from "react-native-morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";
import { AaveStyleStepHeader, DemoCard, DemoCopy } from "./shared";

const CARD_HEIGHT = 180;

const Body = ({
  color,
  tint,
  icon,
  copy,
}: {
  color: string;
  tint: string;
  icon: "1.circle.fill" | "2.circle.fill" | "3.circle.fill";
  copy: string;
}) => (
  <Tray.Body>
    <Tray.Section style={{ gap: 16 }}>
      <DemoCard height={CARD_HEIGHT} color={color} tint={tint} icon={icon} />
      <DemoCopy>{copy}</DemoCopy>
    </Tray.Section>
  </Tray.Body>
);

const NextButton = ({ label }: { label: string }) => {
  const { next } = useTrayNavigation();

  return <PrimaryButton label={label} onPress={next} />;
};

const FooterEqualHeightsTray = () => (
  <Tray.Root stepOptions={{ className: "bg-white" }}>
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Footer Equal Heights" />
    </Tray.Trigger>

    <Tray.Step key="footer-equal-one">
      <AaveStyleStepHeader title="A title" first />
      <Body
        color="#DDF5FF"
        tint="#09B6F4"
        icon="1.circle.fill"
        copy="Same height as step two, footer included."
      />
      <Tray.Footer >
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-equal-two">
      <AaveStyleStepHeader title="A much longer title" />
      <Body
        color="#FFE9DD"
        tint="#FF7A2F"
        icon="2.circle.fill"
        copy="A different footer of the same height."
      />
      <Tray.Footer exit="withContent">
        <NextButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-equal-three">
      <AaveStyleStepHeader title="A not so long title" />
      <Body
        color="#E4F8E9"
        tint="#22C766"
        icon="3.circle.fill"
        copy="Same body, no footer. Go back to bring it in."
      />
    </Tray.Step>
  </Tray.Root>
);

export default FooterEqualHeightsTray;
