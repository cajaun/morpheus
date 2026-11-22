import type { SFSymbol } from "expo-symbols";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import { PrimaryButton } from "../shared/primary-button";
import { AaveStyleStepHeader, DemoCard, DemoCopy } from "./shared";

// Steps 1-3 share one footer (same id): it stays on screen while the steps
// change and only its label updates. Step 4 has no footer: moving to it, the
// footer leaves with step 3's content; moving back, it enters with step 3's.
// The steps have different heights so the sheet resizes every time.
const Step = ({
  height,
  color,
  tint,
  icon,
  copy,
}: {
  height: number;
  color: string;
  tint: string;
  icon: SFSymbol;
  copy?: string;
}) => (
  <Tray.Body>
    <Tray.Section >
      <DemoCard height={height} color={color} tint={tint} icon={icon} />
    </Tray.Section>
  </Tray.Body>
);

const LastStep = () => {
  const { close } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section >
        <DemoCard height={340} color="#F1E8FF" tint="#8B5CF6" icon="4.circle.fill" />
        
      </Tray.Section>
    </Tray.Body>
  );
};

// The footer is written inline as <Tray.Footer> in each step: the step
// compiler looks for Tray.Footer elements directly inside Tray.Step.
const FooterStepsTray = () => (
  <Tray.Root stepOptions={{ className: "bg-white"}}>
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Footer Steps" />
    </Tray.Trigger>

    <Tray.Step key="footer-one">
      <AaveStyleStepHeader title="Step one" first />
      <Step
        height={150}
        color="#DDF5FF"
        tint="#09B6F4"
        icon="1.circle.fill"
      />
      <Tray.Footer id="continue">
        <ContinueButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-two">
      <AaveStyleStepHeader title="Step two" />
      <Step
        height={300}
        color="#FFE9DD"
        tint="#FF7A2F"
        icon="2.circle.fill"
      />
      <Tray.Footer id="continue">
        <ContinueButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-three">
      <AaveStyleStepHeader title="Step three" />
      <Step
        height={500}
        color="#E4F8E9"
        tint="#22C766"
        icon="3.circle.fill"
      />
  <Tray.Footer id="continue">
        <ContinueButton label="Continue" />
      </Tray.Footer>
    </Tray.Step>

    <Tray.Step key="footer-four">
      <AaveStyleStepHeader title="Step four" />
      <LastStep />
    </Tray.Step>
  </Tray.Root>
);

const ContinueButton = ({ label }: { label: string }) => {
  const { next } = useTrayNavigation();

  return <PrimaryButton label={label} onPress={next} />;
};

export default FooterStepsTray;
