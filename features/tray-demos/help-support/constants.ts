import type { SFSymbol } from "expo-symbols";
import type { HelpKind } from "./types";

export const HELP_OPTIONS: Array<{
  key: HelpKind;
  label: string;
  description: string;
  icon: SFSymbol;
  iconColor: string;
}> = [
  {
    key: "bug",
    label: "Report Bug",
    description: "Let us know about a specific issue you're experiencing",
    icon: "ladybug.fill",
    iconColor: "#FF7A1A",
  },
  {
    key: "feedback",
    label: "Share Feedback",
    description: "Let us know how to improve by providing some feedback",
    icon: "bubble.left.fill",
    iconColor: "#49A8FF",
  },
  {
    key: "other",
    label: "Something Else",
    description: "Request features, leave a nice comment, or anything else",
    icon: "list.bullet.rectangle.fill",
    iconColor: "#16C2B2",
  },
];

export const AREA_OPTIONS: Array<{
  key: string;
  label: string;
  icon: SFSymbol;
}> = [
  { key: "send", label: "Send", icon: "paperplane" },
  { key: "swaps", label: "Swaps", icon: "arrow.2.circlepath" },
  { key: "activity", label: "Activity", icon: "waveform.path.ecg" },
  { key: "tokens", label: "Tokens", icon: "seal" },
  { key: "collectibles", label: "Collectibles", icon: "photo" },
  { key: "other", label: "Other", icon: "ellipsis.circle" },
];

export const flowAttachmentCopy: Record<HelpKind, string> = {
  bug:
    "If you'd like, upload any helpful screenshots or screen recordings. Do not include any private, sensitive or inappropriate imagery.",
  feedback:
    "If you'd like, upload any screenshots that help explain your feedback. Do not include any private, sensitive or inappropriate imagery.",
  other:
    "If you'd like, upload any screenshots or screen recordings that add more context. Do not include any private, sensitive or inappropriate imagery.",
};
