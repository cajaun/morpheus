import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { interpolate, useDerivedValue } from "react-native-reanimated";
import { Tray, useTrayOriginProgress, useTrayNavigation } from "react-native-morpheus";
import {
  EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
  EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
  HORIZONTAL_MARGIN,
  SCREEN_WIDTH,
  TRAY_PRIMARY_BUTTON_HEIGHT,
  TRAY_SHEET_BODY_HORIZONTAL_PADDING,
} from "react-native-morpheus/constants";
import { CleaveButton } from "@/features/tray-demos/presets/cleave-button";
import { trayDemoColors } from "@/shared/theme/tokens";
import { PressableScale } from "@/shared/ui/pressable-scale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WARNING_RED = "#FF1F45";
const MUTED_TEXT = "#9FA1A8";
const DARK_TEXT = "#25272D";
const CARD_ADDRESS = "0xc608:···e9cb";
const SECONDARY_ACTION = "#F3F4F6";
// the trigger fills the collapsed origin frame exactly, so the shell starts on the button's own edges
const TRIGGER_WIDTH =
  SCREEN_WIDTH - EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN * 2;
// the footer row at rest spans the sheet's content grid
const FOOTER_ROW_WIDTH =
  SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - TRAY_SHEET_BODY_HORIZONTAL_PADDING * 2;
const BACKUP_WARNING_GAP = 20;

const WarningFooter = () => {
  const { close } = useTrayNavigation();
  const originProgress = useTrayOriginProgress();
  // the row follows the footer frame from the trigger's width to the sheet grid on the origin clock, so the handoff has no jump
  const rowWidth = useDerivedValue(() =>
    interpolate(
      originProgress?.value ?? 1,
      [0, 1],
      [TRIGGER_WIDTH, FOOTER_ROW_WIDTH],
    ),
  );

  return (
    <Tray.Footer style={{ width: "100%" }}>
      <CleaveButton
        split
        // the footer splits as the tray opens out of its trigger
        splitProgress={originProgress ?? 1}
        width={FOOTER_ROW_WIDTH}
        widthValue={rowWidth}
        primaryAction={{
          backgroundColor: WARNING_RED,
          onPress: close,
        }}
        secondaryAction={{
          backgroundColor: SECONDARY_ACTION,
          onPress: close,
        }}
      />
    </Tray.Footer>
  );
};

const WarningTrigger = () => (
  <Tray.Trigger haptics="feedback">
    {/* the trigger is the same button whole, the trigger owns the haptics */}
    <CleaveButton
      split={false}
      splitProgress={0}
      width={TRIGGER_WIDTH}
      haptics={false}
      primaryAction={{
        backgroundColor: WARNING_RED,
      }}
    />
  </Tray.Trigger>
);

const RemoveWalletControls = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        height: 36,
        justifyContent: "space-between",
        paddingHorizontal: 26,
      }}
    >
      <PressableScale
        style={{
          alignItems: "center",
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <SymbolView
          name="xmark"
          tintColor="#96979D"
          size={24}
          weight="regular"
        />
      </PressableScale>

      <PressableScale
        style={{
          alignItems: "center",
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <SymbolView
          name="questionmark.circle"
          tintColor="#96979D"
          size={26}
          weight="regular"
        />
      </PressableScale>
    </View>
  );
};

const WalletCard = () => {
  return (
    <View
      style={{
        backgroundColor: WARNING_RED,
        borderRadius: 25,
        height: 240,
        justifyContent: "space-between",
        paddingBottom: 20,
        paddingHorizontal: 22,
        paddingTop: 24,
      }}
    >
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <SymbolView
          name="dog.fill"
          tintColor="#FFFFFF"
          size={40}
          weight="regular"
        />

        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Text
            className="font-bold"
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              lineHeight: 23,
            }}
          >
            {CARD_ADDRESS}
          </Text>
          <SymbolView
            name="square.on.square"
            tintColor="#FFFFFF"
            size={19}
            weight="regular"
          />
        </View>
      </View>

      <View
        style={{
          alignItems: "flex-end",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            className="font-bold"
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              lineHeight: 25,
            }}
          >
            Testing
          </Text>
          <Text
            className="font-medium"
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 18,
              lineHeight: 22,
            }}
          >
            0 ETH
          </Text>
        </View>

        <PressableScale
          style={{
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            height: 34,
            justifyContent: "center",
            paddingHorizontal: 13,
          }}
        >
          <Text
            className="font-semibold"
            style={{
              color: WARNING_RED,
              fontSize: 17,
              lineHeight: 22,
            }}
          >
            Back Up Now
          </Text>
        </PressableScale>
      </View>
    </View>
  );
};

const BackupWarning = () => {
  return (
    <View
      style={{
        alignItems: "center",
        borderColor: "#F0F0F3",
        borderRadius: 28,
        borderStyle: "dashed",
        borderWidth: 2,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          left: 0,
          paddingHorizontal: 5,
          position: "absolute",
          right: 0,
          top: -12,
        }}
      >
        <SymbolView
          name="exclamationmark.triangle.fill"
          tintColor="#E7E7EB"
          size={20}
          weight="regular"
        />
      </View>

      <Text
        className="font-medium"
        style={{
          color: MUTED_TEXT,
          fontSize: 14,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        Make sure you’ve backed up your wallet manually or{"\n"}
        with iCloud, otherwise you will lose access forever.
      </Text>
    </View>
  );
};

const RemoveWalletInfoStep = () => {
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
            alignItems: "center",
            height: 68,
            justifyContent: "center",
            width: 68,
          }}
        >
          <View
            style={{
              alignItems: "center",
              borderColor: "#FF4353",
              borderRadius: 24,
              borderWidth: 3,
              height: 48,
              justifyContent: "center",
              width: 48,
            }}
          >
            <Text
              className="font-bold"
              style={{
                color: "#FF4353",
                fontSize: 31,
                lineHeight: 34,
              }}
            >
              !
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <PressableScale
            onPress={close}
            style={{
              alignItems: "center",
              backgroundColor: "#F5F5F8",
              borderRadius: 999,
              height: 36,
              justifyContent: "center",
              width: 36,
            }}
          >
            <SymbolView
              name="xmark"
              tintColor="#96979A"
              size={18}
              weight="bold"
            />
          </PressableScale>
        </View>
      </View>

      <Tray.Section style={{ gap: 12, paddingHorizontal: 28 }}>
        <View style={{ gap: 12 }}>
          <Text
            className="font-bold"
            style={{
              color: DARK_TEXT,
              fontSize: 25,
              lineHeight: 31,
              letterSpacing: 0.1,
            }}
          >
            Are you sure?
          </Text>

          <Text
            className="font-medium"
            style={{
              color: MUTED_TEXT,
              fontSize: 20,
              lineHeight: 28,
              letterSpacing: 0.1,
            }}
          >
            You haven't backed up your wallet yet. If you remove it, you could
            lose access forever. We suggest tapping Cancel and backing up your
            wallet first with a valid recovery method.
          </Text>
        </View>
      </Tray.Section>
    </Tray.Body>
  );
};

const RemoveWalletPage = ({
  topInset,
}: {
  topInset: number;
}) => {
  return (
    <View style={{ backgroundColor: "#FFFFFF", flex: 1 }}>
      <View style={{ paddingTop: topInset + 13 }}>
        <RemoveWalletControls />
      </View>

      <View
        style={{
          paddingHorizontal: 56,
          paddingTop: 68,
        }}
      >
        <Text
          className="font-semibold"
          style={{
            color: DARK_TEXT,
            fontSize: 32,
            lineHeight: 34,
            letterSpacing: 0.1,
          }}
        >
          Remove Wallet
        </Text>

        <Text
          className="font-medium"
          style={{
            color: MUTED_TEXT,
            fontSize: 21,
            lineHeight: 28,
            marginTop: 8,
          }}
        >
          This wallet will be permanently{"\n"}
          removed from your device.
        </Text>

        <View style={{ marginHorizontal: -30, marginTop: 86 }}>
          <WalletCard />
        </View>

      </View>
    </View>
  );
};

const RemoveWalletWarningTray = () => {
  const { bottom, top } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <RemoveWalletPage topInset={top} />

      {/* the warning sits on the page directly above the trigger, the opening tray covers both */}
      <View
        style={{
          bottom:
            bottom +
            EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET +
            TRAY_PRIMARY_BUTTON_HEIGHT +
            BACKUP_WARNING_GAP,
          left: 26,
          position: "absolute",
          right: 26,
        }}
      >
        <BackupWarning />
      </View>

      <Tray.Root
        stepOptions={{
          className: "bg-white",
          footerStyle: { backgroundColor: trayDemoColors.white },
        }}
        footer={<WarningFooter />}
        transition={{
          open: "expandFromTrigger",
          close: "collapseToTrigger",
        }}
      >
        <Tray.Step>
          <RemoveWalletInfoStep />
        </Tray.Step>

        <View
          style={{
            bottom: bottom + EXPAND_FROM_TRIGGER_COLLAPSED_BOTTOM_INSET,
            alignItems: "center",
            left: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
            position: "absolute",
            right: EXPAND_FROM_TRIGGER_COLLAPSED_HORIZONTAL_MARGIN,
          }}
        >
          <WarningTrigger />
        </View>
      </Tray.Root>
    </View>
  );
};

export default RemoveWalletWarningTray;
