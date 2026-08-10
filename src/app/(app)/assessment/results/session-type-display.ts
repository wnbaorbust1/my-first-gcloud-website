import type { RecommendedSessionType } from "@/generated/prisma/enums";

export const SESSION_TYPE_DISPLAY: Record<
  RecommendedSessionType,
  { icon: string; label: string; badgeClasses: string }
> = {
  PASSION: { icon: "💗", label: "Passion", badgeClasses: "bg-passion-50 text-passion-700 border-passion-200" },
  POWER: { icon: "⚡", label: "Power", badgeClasses: "bg-power-50 text-power-700 border-power-200" },
  LEGACY: { icon: "👑", label: "Legacy", badgeClasses: "bg-legacy-50 text-legacy-700 border-legacy-200" },
  GROWTH: { icon: "🚀", label: "Growth", badgeClasses: "bg-gold-50 text-gold-700 border-gold-200" },
};
