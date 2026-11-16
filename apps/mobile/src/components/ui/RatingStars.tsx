import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { BRAND } from "@nzila/shared";
import { useTranslation } from "react-i18next";

export function RatingStars({
  value,
  onChange,
  size = 28,
  readOnly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={t("rideDetail.ratingStars", { count: star })}
          disabled={readOnly || !onChange}
          onPress={() => onChange?.(star)}
          hitSlop={4}
        >
          <Star
            size={size}
            color={star <= value ? BRAND.gold : "#B8B0A2"}
            fill={star <= value ? BRAND.gold : "transparent"}
          />
        </Pressable>
      ))}
    </View>
  );
}
