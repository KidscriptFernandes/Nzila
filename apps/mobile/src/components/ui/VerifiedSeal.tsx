import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react-native";
import { Badge } from "./Badge";

export function VerifiedSeal({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Badge
      tone="green"
      label={compact ? t("profile.verified") : t("verification.VERIFICADO")}
      icon={<BadgeCheck size={12} color="#2E7D4F" />}
    />
  );
}
