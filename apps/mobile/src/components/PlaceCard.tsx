import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PlaceDTO } from "@nzila/shared";
import {
  BedDouble,
  BusFront,
  Camera,
  CreditCard,
  Fuel,
  HeartPulse,
  Landmark,
  MapPin,
  Pill,
  Plane,
  Utensils,
} from "lucide-react-native";
import { Card } from "./ui/Card";
import { useThemeColors } from "@/lib/theme";

const ICONS = {
  HOTEL: BedDouble,
  RESTAURANTE: Utensils,
  HOSPITAL: HeartPulse,
  FARMACIA: Pill,
  BANCO: Landmark,
  ATM: CreditCard,
  PARAGEM: BusFront,
  POSTO: Fuel,
  ATRACAO: Camera,
  AEROPORTO: Plane,
  OUTRO: MapPin,
} as const;

export function PlaceIcon({ category, size = 20, color }: { category: PlaceDTO["category"]; size?: number; color: string }) {
  const Icon = ICONS[category] ?? MapPin;
  return <Icon size={size} color={color} />;
}

export function PlaceCard({ place, onPress }: { place: PlaceDTO; onPress?: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Card onPress={onPress} className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
        <PlaceIcon category={place.category} color={colors.red} />
      </View>
      <View className="flex-1">
        <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand" numberOfLines={1}>
          {place.name}
        </Text>
        <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted" numberOfLines={1}>
          {place.address ?? t(`category.${place.category}`)}
        </Text>
      </View>
    </Card>
  );
}

export function PlaceCompactCard({ place, onPress }: { place: PlaceDTO; onPress?: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      className="w-44 rounded-2xl border border-line bg-surface p-4 active:opacity-80 dark:border-night-line dark:bg-coal"
    >
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-nzila-gold-soft dark:bg-nzila-gold/15">
        <PlaceIcon category={place.category} color={colors.gold} size={19} />
      </View>
      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand" numberOfLines={2}>
        {place.name}
      </Text>
      <Text className="mt-1 font-body text-[11px] text-ink-soft dark:text-night-muted">
        {t(`category.${place.category}`)}
      </Text>
    </Pressable>
  );
}
