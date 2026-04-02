import React from "react";
import { View, Text } from "react-native";
import { PressableScale } from "@/components/ui/utils/pressable-scale";
import Header from "@/components/action-tray/content/header";
import { Tray } from "@/components/action-tray";
import { AnimatedOnboardingButton } from "@/components/action-tray/content/button";
import { useTray } from "@/components/action-tray/context";

const OnboardingExample = () => {
  const { next, back, index, total, close } = useTray();

  return (
    <Tray.Root>
      <Tray.Trigger>
        <PressableScale
          style={{
            backgroundColor: "#F5F5FA",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 36,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text className="text-2xl font-sfBold">Onboarding</Text>
        </PressableScale>
      </Tray.Trigger>

      {/* STEP 1 */}
      <Tray.Content scale>
        <Tray.Body>
          <Tray.Header>
            <Header
              step={0}
              leftLabel="Content One"
              shouldClose
              onClose={() => close()}
            />
          </Tray.Header>

          <View
            style={{
              height: 1,
              width: "100%",
              backgroundColor: "#F7F7F7",
            }}
          />

          <Tray.Section>
            <Text
              className=" font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is a test title
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      {/* STEP 2 */}
      <Tray.Content scale>
        <Tray.Body>
          <Tray.Header>
            <Header
              step={1}
              leftLabel="Content Two"
              shouldClose
              onBack={() => back()}
              onClose={() => close()}
            />
          </Tray.Header>

          <View
            style={{
              height: 1,
              width: "100%",
              backgroundColor: "#F7F7F7",
            }}
          />

          <Tray.Section>
            <Text
              className=" font-sfMedium"
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Different heading
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Cum ad
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      <Tray.Content scale>
        <Tray.Body>
          <Tray.Header>
            <Header
              step={2}
              leftLabel="Content Three"
              shouldClose
              onBack={() => back()}
              onClose={() => close()}
            />
          </Tray.Header>

          <View
            style={{
              height: 1,
              width: "100%",
              backgroundColor: "#F7F7F7",
            }}
          />

          <Tray.Section scrollable>
            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Here's a lot more text. Lorem ipsum dolor amet. Lorem ipsum dolor
              amet. Lorem ipsum dolor amet. Lorem ipsum dolor amet. Lorem ipsum
              dolor amet. Lorem ipsum dolor amet.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo vero
              magni distinctio tenetur doloremque neque voluptates quidem
              reprehenderit suscipit est enim, laboriosam maxime consequuntur
              eaque aspernatur doloribus pariatur commodi aliquam?
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo vero
              magni distinctio tenetur doloremque neque voluptates quidem
              reprehenderit suscipit est enim, laboriosam maxime consequuntur
              eaque aspernatur doloribus pariatur commodi aliquam? Lorem ipsum
              dolor sit amet consectetur adipisicing elit. Necessitatibus totam
              eos porro a adipisci cumque doloremque. Amet fuga ad voluptas
              obcaecati? Similique, iusto vitae. Laudantium architecto ducimus
              aperiam id illum.
            </Text>

            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
              bla test test test many wods. this is a new sentence and we'll see
              how that fares too.
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      <Tray.Content scale>
        <Tray.Body>
          <Tray.Header>
            <Header
              step={3}
              leftLabel="Content Four"
              shouldClose
                 onBack={() => back()}
              onClose={() => close()}
            />
          </Tray.Header>

          <View
            style={{
              height: 1,
              width: "100%",
              backgroundColor: "#F7F7F7",
            }}
          />

          <Tray.Section>
            <Text
              className="text-[#94999F] font-sfMedium "
              style={{
                fontSize: 21,
                lineHeight: 28,
                letterSpacing: 0.2,
              }}
            >
              This is some example test that spans over multiple lines bla bla
            </Text>
          </Tray.Section>
        </Tray.Body>
      </Tray.Content>

      <Tray.Footer>
        <AnimatedOnboardingButton
          step={index}
          totalSteps={total}
          onNext={next}
          onSecondaryPress={back}
          onFinish={close}
        />
      </Tray.Footer>
    </Tray.Root>
  );
};

export default OnboardingExample;
