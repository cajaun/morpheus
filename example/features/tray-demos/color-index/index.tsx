import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  Tray,
  useTrayFlow,
  useTrayMorphProgress,
  type TrayStepDefinition,
} from "morpheus";
import FlowHeader from "@/features/tray-demos/presets/flow-header";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { ExampleTrigger } from "../shared/example-trigger";
import { trayDemoText } from "@/shared/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ColorStep = {
  key: string;
  name: string;
  colors: string[];
};

const COLOR_STEPS: ColorStep[] = [
  {
    key: "ember-pair",
    name: "Ember Pair",
    colors: ["#F36552", "#DF4C3F"],
  },
  {
    key: "garden-study",
    name: "Garden Study",
    colors: ["#268555", "#2C9663", "#31A46F", "#35B075", "#3ABD7F", "#3CBF85"],
  },
  {
    key: "blue-hour",
    name: "Blue Hour",
    colors: ["#205AB9", "#2A65CE", "#357AEF", "#568DEC"],
  },
  {
    key: "violet-index",
    name: "Violet Index",
    colors: [
      "#65419F",
      "#7049AF",
      "#7C50C1",
      "#855AC7",
      "#8B61CF",
      "#956CD4",
      "#A078DB",
      "#AB86DE",
    ],
  },
];

const ColorIndexHeader = ({ step }: { step: ColorStep }) => {
  const { close, back, index } = useTrayFlow();

  return (
    <Tray.Header withSeparator>
      <FlowHeader
        step={index}
        leftLabel={
          <View>
            <Text className="font-sf-semibold" style={trayDemoText.title}>
              {step.name}
            </Text>
          </View>
        }
        shouldClose
        onClose={close}
        onBack={index > 0 ? back : undefined}
      />
    </Tray.Header>
  );
};

const ColorSwatches = ({
  colors,
  onSelectColor,
}: {
  colors: string[];
  onSelectColor: (colorIndex: number) => void;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const swatchHeight = Math.min(
    124,
    Math.max(94, ((screenWidth - 112) / 2) * 0.78),
  );
  const rows = Array.from(
    { length: Math.ceil(colors.length / 2) },
    (_, rowIndex) => colors.slice(rowIndex * 2, rowIndex * 2 + 2),
  );

  return (
    <View
      style={{
        alignSelf: "stretch",
        gap: 12,
        width: "100%",
      }}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={{ flexDirection: "row", gap: 12, width: "100%" }}
        >
          {row.map((color, colorIndex) => (
            <PressableScale
              key={`${color}-${colorIndex}`}
              onPress={() => onSelectColor(rowIndex * 2 + colorIndex)}
              style={{
                flex: 1,
                height: swatchHeight,
              }}
            >
              <View
                style={{
                  backgroundColor: color,
                  borderRadius: 26,
                  flex: 1,
                }}
              />
            </PressableScale>
          ))}
        </View>
      ))}
    </View>
  );
};

const ColorIndexFooter = ({
  step,
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
}: {
  step: ColorStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
}) => {
  const primaryColor = step.colors[step.colors.length - 1];
  const secondaryColor = isFirstStep ? "#F7F1F1" : `${step.colors[0]}18`;

  return (
    <Tray.Footer style={{ alignItems: "center", width: "100%" }}>
      <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
        <PressableScale
          onPress={isFirstStep ? undefined : onBack}
          style={{
            alignItems: "center",
            backgroundColor: secondaryColor,
            borderRadius: 50,
            flex: 1,
            height: 50,
            justifyContent: "center",
          }}
        >
          <Text
            className="font-sf-bold"
            style={[
              trayDemoText.button,
              { color: isFirstStep ? "#E4CACA" : step.colors[0] },
            ]}
          >
            Back
          </Text>
        </PressableScale>
        <PressableScale
          onPress={isLastStep ? undefined : onNext}
          style={{
            alignItems: "center",
            backgroundColor: primaryColor,
            borderRadius: 50,
            flex: 1,
            height: 50,
            justifyContent: "center",
          }}
        >
          <Text
             className="font-sf-bold text-white "
                   style={trayDemoText.button}
          >
            {isLastStep ? "Done" : "Next"}
          </Text>
        </PressableScale>
      </View>
    </Tray.Footer>
  );
};

const ColorIndexStep = ({
  step,
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  onSelectColor,
}: {
  step: ColorStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSelectColor: (colorIndex: number) => void;
}) => {
  const { next } = useTrayFlow();

  return (
    <Tray.Body>
      <Tray.Section>
        <ColorSwatches
          colors={step.colors}
          onSelectColor={(colorIndex) => {
            onSelectColor(colorIndex);
            next();
          }}
        />
        <ColorIndexFooter
          step={step}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onBack={onBack}
          onNext={onNext}
        />
      </Tray.Section>
    </Tray.Body>
  );
};

const COLOR_NAMES: Record<string, string[]> = {
  "ember-pair": ["Signal Red", "Ember Shadow"],
  "garden-study": [
    "Garden Deep",
    "Leaf Green",
    "Fern",
    "Meadow",
    "Fresh Leaf",
    "Garden Light",
  ],
  "blue-hour": ["Deep Blue", "Cobalt", "Blue Hour", "Skyline"],
  "violet-index": [
    "Royal Violet",
    "Amethyst",
    "Orchid",
    "Iris",
    "Lilac",
    "Violet Mist",
    "Soft Violet",
    "Index Light",
  ],
};

const COLOR_STORIES: Record<string, string> = {
  "ember-pair":
    "A warm signal for after-hours notes and little moments of urgency.",
  "garden-study":
    "A grounded green study for quiet focus, growth, and fresh starts.",
  "blue-hour":
    "A calm blue sequence for the hour when daylight turns thoughtful.",
  "violet-index": "A layered violet collection with a soft, editorial finish.",
};

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    b: parseInt(value.slice(4, 6), 16),
    g: parseInt(value.slice(2, 4), 16),
    r: parseInt(value.slice(0, 2), 16),
  };
};

const hexToHsl = (hex: string) => {
  const { r: red, g: green, b: blue } = hexToRgb(hex);
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(lightness * 100) };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return {
    h: Math.round((hue / 6) * 360),
    l: Math.round(lightness * 100),
    s: Math.round(saturation * 100),
  };
};

const ColorDetailStep = ({
  step,
  colorIndex,
}: {
  step: ColorStep;
  colorIndex: number;
}) => {
  const { requestClose } = useTrayFlow();
  const morphProgress = useTrayMorphProgress();
  const { bottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const color = step.colors[colorIndex] ?? step.colors[0];
  const colorName =
    COLOR_NAMES[step.key]?.[colorIndex] ?? `${step.name} ${colorIndex + 1}`;
  const { r, g, b } = hexToRgb(color);
  const { h, s, l } = hexToHsl(color);
  const animatedHeroStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      morphProgress.value,
      [0, 1],
      ["#FFFFFF", color],
    ),
  }));

  return (
    <Tray.Body
      fullScreen
      style={{
        backgroundColor: "#FFFFFF",
        flex: 1,
        paddingBottom: bottom,
        paddingHorizontal: 0,
        paddingTop: 0,
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFFF",
          flex: 1,
          minHeight: screenHeight,
          position: "relative",
        }}
      >
        <Animated.View
          style={[
            animatedHeroStyle,
            {
              flex: 0.65,
              justifyContent: "space-between",
              paddingHorizontal: 26,
              paddingTop: 28,
            },
          ]}
        >
          <Text
            style={{ color: "#3B1930", fontFamily: "Sf-medium", fontSize: 14 }}
          >
            Palette sample
          </Text>

          <View style={{ gap: 20, paddingBottom: 24 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Sf-semibold",
                fontSize: 46,
                lineHeight: 52,
              }}
            >
              {colorName}
            </Text>
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Sf-medium",
                  fontSize: 24,
                }}
              >
                {color}
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Sf-medium",
                  fontSize: 32,
                }}
              >
                {String(colorIndex + 1).padStart(2, "0")}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View
          style={{
            flex: 0.30,
            paddingBottom: bottom + 72,
            paddingHorizontal: 26,
            paddingTop: 24,
          }}
        >
          <Text
            style={{ color: "#77746F", fontFamily: "Sf-medium", fontSize: 14 }}
          >
            Color story
          </Text>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: "#26231F",
                fontFamily: "Sf-semibold",
                fontSize: 20,
              }}
            >
              {step.name}
            </Text>
            <Text
              style={{
                color: "#77746F",
                fontFamily: "Sf-regular",
                fontSize: 14,
              }}
            >
              {step.key.replace("-", " ")}
            </Text>
          </View>

          <Text
            style={{
              color: "#46433F",
              fontFamily: "Sf-regular",
              fontSize: 17,
              lineHeight: 23,
              marginTop: 22,
            }}
          >
            {COLOR_STORIES[step.key]}
          </Text>

          <View style={{ flexDirection: "row", gap: 44, marginTop: 22 }}>
            <View>
              <Text
                style={{
                  color: "#77746F",
                  fontFamily: "Sf-medium",
                  fontSize: 13,
                }}
              >
                Rgb
              </Text>
              <Text
                style={{
                  color: "#26231F",
                  fontFamily: "Sf-medium",
                  fontSize: 16,
                  marginTop: 4,
                }}
              >
                {r}, {g}, {b}
              </Text>
            </View>
            <View>
              <Text
                style={{
                  color: "#77746F",
                  fontFamily: "Sf-medium",
                  fontSize: 13,
                }}
              >
                Hsl
              </Text>
              <Text
                style={{
                  color: "#26231F",
                  fontFamily: "Sf-medium",
                  fontSize: 16,
                  marginTop: 4,
                }}
              >
                {h}°, {s}%, {l}%
              </Text>
            </View>
          </View>

        </View>

        <PressableScale
          onPress={requestClose}
          className = "rounded-full"
          style={{
            alignItems: "center",
            backgroundColor: "#000000",
            bottom: bottom + 64,
            height: 56,
            justifyContent: "center",
            left: 26,
            position: "absolute",
            right: 26,
            borderCurve: "continuous"
          }}
        >
          <Text
                 className="font-sf-bold text-white "
                   style={trayDemoText.button}
          >
            Done
          </Text>
        </PressableScale>
      </View>
    </Tray.Body>
  );
};

const ColorIndexTray = () => {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const step = COLOR_STEPS[paletteIndex];

  const changePalette = (direction: -1 | 1) => {
    setPaletteIndex((current) => {
      const nextIndex = Math.max(
        0,
        Math.min(COLOR_STEPS.length - 1, current + direction),
      );
      setSelectedColorIndex(0);
      return nextIndex;
    });
  };

  const steps: TrayStepDefinition[] = [
    {
      key: `${step.key}-overview`,
      content: (
        <ColorIndexStep
          step={step}
          isFirstStep={paletteIndex === 0}
          isLastStep={paletteIndex === COLOR_STEPS.length - 1}
          onBack={() => changePalette(-1)}
          onNext={() => changePalette(1)}
          onSelectColor={setSelectedColorIndex}
        />
      ),
      header: <ColorIndexHeader step={step} />,
      options: { className: "bg-white" },
    },
    {
      key: `${step.key}-detail-${selectedColorIndex}`,
      content: <ColorDetailStep step={step} colorIndex={selectedColorIndex} />,
      options: {
        className: "bg-white",
        fullScreen: true,
        shouldScaleBackground: false,
        fullScreenSafeAreaTop: true,
        fullScreenDraggable: false,
        fullScreenCloseBehavior: "returnToShell",
      },
    },
  ];

  return (
    <Tray.Root steps={steps}>
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Color Index" />
      </Tray.Trigger>
    </Tray.Root>
  );
};

export default ColorIndexTray;
