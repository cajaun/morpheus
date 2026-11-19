import type { ReactNode } from "react";
import { useState } from "react";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { TRAY_HEADER_CLOSE_ICON_SIZE } from "react-native-morpheus/constants";
import { PressableScale } from "@/shared/ui/pressable-scale";
import {
  trayDemoColors,
  trayDemoRadius,
  trayDemoText,
} from "@/shared/theme/tokens";
import { ExampleTrigger } from "../shared/example-trigger";

const PURPLE = "#9896F8";
const EMOJI = "😁";

const AVATAR_COLORS = [
  "#FF2855",
  "#FE2C90",
  "#E92EF6",
  "#9446FF",
  "#4F3EF9",
  "#0077FE",
  "#019DED",
  "#00A9FF",
  "#00B6C4",
  "#00B372",
  "#01C33E",
  "#5FC800",
  "#F1A701",
  "#FF8E00",
  "#FF5D01",
  "#FE2632",
  "#CDA845",
  "#C87E41",
  "#012E5D",
  "#191919",
] as const;

const ChangeAvatarHeader = ({
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
        <Text className="font-semibold text-black" style={trayDemoText.Title1}>
          {title}
        </Text>
      </Tray.HeaderRow>
    </Tray.Header>
  );
};

const AvatarBackButton = ({ onPress }: { onPress: () => void }) => (
  <Tray.HeaderButton onPress={onPress}>
    <SymbolView
      name="chevron.left"
      type="palette"
      tintColor="#787878"
      size={TRAY_HEADER_CLOSE_ICON_SIZE}
      weight="semibold"
    />
  </Tray.HeaderButton>
);

const AvatarBackAction = () => {
  const { back } = useTrayNavigation();

  return <AvatarBackButton onPress={back} />;
};

const AvatarActionRow = ({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) => (
  <PressableScale onPress={onPress} style={styles.actionCard}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text className="font-semibold text-black" style={trayDemoText.Title2}>
      {label}
    </Text>
  </PressableScale>
);

const ChangeAvatarOptionsStep = () => {
  const { next } = useTrayNavigation();

  return (
    <Tray.Body>
      <Tray.Section style={styles.optionsSection}>
        <AvatarActionRow
          icon={
            <SymbolView
              name="camera.fill"
              type="palette"
              tintColor="#858585"
              size={42}
              weight="semibold"
            />
          }
          label="Take Photo"
          onPress={() => {}}
        />
        <AvatarActionRow
          icon={
            <SymbolView
              name="photo.on.rectangle.angled"
              type="palette"
              tintColor="#858585"
              size={42}
              weight="semibold"
            />
          }
          label="Choose Photo"
          onPress={() => {}}
        />
        <AvatarActionRow
          icon={<Text style={styles.actionEmoji}>🙂</Text>}
          label="Choose Emoji"
          onPress={next}
        />
      </Tray.Section>
    </Tray.Body>
  );
};

const EmojiPreview = ({ color }: { color: string }) => (
  <View style={styles.previewContainer}>
    <View style={[styles.avatarPreview, { backgroundColor: color }]}>
      <Text style={styles.previewEmoji}>{EMOJI}</Text>
    </View>
    <View style={styles.editButton}>
      <SymbolView
        name="pencil"
        type="palette"
        tintColor="#000000"
        size={24}
        weight="bold"
      />
    </View>
  </View>
);

const UseEmojiBody = () => {
  const { close } = useTrayNavigation();
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[7]);

  return (
    <Tray.Body>
      <Tray.Section withAction style={styles.emojiSection}>
        <EmojiPreview color={selectedColor} />

        <View style={styles.colorGrid}>
          {AVATAR_COLORS.map((color) => {
            const selected = selectedColor === color;

            return (
              <PressableScale
                key={color}
                onPress={() => setSelectedColor(color)}
                style={styles.colorButton}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                  ]}
                >
                  {selected ? <View style={styles.selectedColorRing} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>

        <Tray.PrimaryButton
          onPress={close}
          style={{ backgroundColor: PURPLE }}
        >
          <Text className="font-semibold text-white" style={trayDemoText.Button}>
            Save
          </Text>
        </Tray.PrimaryButton>
      </Tray.Section>
    </Tray.Body>
  );
};

const ChangeAvatarTray = () => (
  <Tray.Root
    stepOptions={{
      className: "bg-white",
      footerStyle: { backgroundColor: trayDemoColors.white },
    }}
  >
    <Tray.Trigger haptics="feedback">
      <ExampleTrigger label="Change Avatar" />
    </Tray.Trigger>

    <Tray.Step>
      <ChangeAvatarHeader title="Change Avatar" />
      <ChangeAvatarOptionsStep />
    </Tray.Step>

    <Tray.Step >
      <ChangeAvatarHeader
        title="Use Emoji"
        left={<AvatarBackAction />}
      />
      <UseEmojiBody />
    </Tray.Step>
  </Tray.Root>
);

const styles = {
  optionsSection: {
    gap: 16,
    paddingTop: 28,
    paddingBottom: 28,
  },
  actionCard: {
    width: "100%",
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: "#ECECF0",
    borderRadius: trayDemoRadius.card,
    backgroundColor: trayDemoColors.white,
  },
  actionIcon: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEmoji: {
    fontSize: 34,
    lineHeight: 42,
  },
  emojiSection: {
    alignItems: "center",
    gap: 16,
    paddingTop: 24,
    paddingBottom: 28,
  },
  previewContainer: {
    width: 108,
    height: 108,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPreview: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  editButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: trayDemoColors.white,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  colorGrid: {
    width: 292,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
    rowGap: 12,
  },
  colorButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedColorRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: trayDemoColors.white,
  },
} as const;

export default ChangeAvatarTray;
