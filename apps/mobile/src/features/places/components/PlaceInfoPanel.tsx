import { Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ExternalLink, Navigation } from "lucide-react-native";
import type { PlaceDTO } from "@nzila/shared";
import { PlaceIcon } from "@/components/PlaceCard";
import { PlacesMap } from "@/components/PlacesMap";
import { Button } from "@/components/ui/Button";
import { mediaUrl } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";

export function PlaceInfoPanel({
  place,
  onOpenMaps,
  onRequestRide,
  compact = false,
}: {
  place: PlaceDTO;
  onOpenMaps: () => void;
  onRequestRide: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="gap-3 px-5 pb-4">
      {place.photoUrl ? (
        <Image
          source={{ uri: mediaUrl(place.photoUrl) }}
          resizeMode="cover"
          style={{
            width: "100%",
            height: compact ? 140 : 180,
            borderRadius: 16,
          }}
        />
      ) : null}

      <View
        className="overflow-hidden rounded-2xl border border-line dark:border-night-line"
        style={{ height: compact ? 140 : 180 }}
      >
        <PlacesMap places={[place]} selectedId={place.id} onSelect={() => undefined} />
      </View>

      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
          <PlaceIcon category={place.category} color={colors.red} />
        </View>
        <View className="flex-1">
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {place.address ?? t(`category.${place.category}`)}
          </Text>
          {place.description ? (
            <Text className="mt-1 font-body text-xs leading-4 text-ink-soft dark:text-night-muted">
              {place.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button
          label={t("map.openMaps")}
          variant="outline"
          size="sm"
          leftIcon={<ExternalLink size={14} color={colors.text} />}
          onPress={onOpenMaps}
        />
        <Button
          label={t("map.requestRide")}
          size="sm"
          leftIcon={<Navigation size={14} color="#FFFFFF" />}
          onPress={onRequestRide}
        />
      </View>
    </View>
  );
}
