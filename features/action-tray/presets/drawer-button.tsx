import { Text, View } from "react-native";
import * as Haptic from "expo-haptics";
import { SFSymbol, SymbolView } from "expo-symbols";
import { PressableScale } from "@/shared/ui/pressable-scale";

type Props = {
  onPress: () => void;
  icon?: SFSymbol;
  label: string;
  description?: string;
  className?: string;
  textColor?: string;
  iconColor?: string;
  variant?: "row" | "card";
};

export default function DrawerButton({
  onPress,
  icon,
  label,
  description,
  className,
  textColor = "black",
  iconColor = "white",
  variant = "row",
}: Props) {
  const handlePress = () => {
    Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isCard = variant === "card";

  return (
    <PressableScale
      className={className}
      onPress={handlePress}
      style={{
        flexDirection: isCard ? "column" : "row",
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderCurve: "continuous",
        backgroundColor: isCard ? "#F9FAFA" : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {icon ? (
          <View
            className="rounded-full"
            style={{ backgroundColor: iconColor, padding: 8 }}
          >
            <SymbolView size={25} name={icon} tintColor="white" weight="bold" />
          </View>
        ) : null}

        <View style={{ flexShrink: 1 }}>
          <Text
            className="text-xl font-sf-medium"
            style={{
              color: textColor,
              fontSize: 18,
              lineHeight: 26,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>

          {description ? (
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 15,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
