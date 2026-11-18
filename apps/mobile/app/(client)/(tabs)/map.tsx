import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ExternalLink,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
} from "lucide-react-native";
import {
  MAP_SAFETY_DISCLAIMER,
  PLACE_CATEGORIES,
  type PlaceCategory,
  type PlaceDTO,
} from "@nzila/shared";
import { PlaceCard, PlaceIcon } from "@/components/PlaceCard";
import { PlacesMap } from "@/components/PlacesMap";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlaces } from "@/features/places/hooks";
import { mediaUrl } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { googleMapsUrl } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

function validCategory(value: string | undefined): PlaceCategory | undefined {
  return PLACE_CATEGORIES.includes(value as PlaceCategory)
    ? (value as PlaceCategory)
    : undefined;
}

export default function ClientMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<PlaceCategory | undefined>(() =>
    validCategory(params.category),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const next = validCategory(params.category);
    if (next) setCategory(next);
  }, [params.category]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const places = usePlaces(category, debouncedSearch);
  const items = useMemo(() => places.data?.items ?? [], [places.data]);
  const selected = items.find((place) => place.id === selectedId) ?? null;

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!items.some((place) => place.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const selectPlace = (place: PlaceDTO) => setSelectedId(place.id);

  return (
    <Screen>
      <ScreenHeader title={t("map.title")} subtitle={t("map.subtitle")} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 shrink-0"
        contentContainerClassName="gap-2 px-5"
      >
        <CategoryChip
          label={t("map.all")}
          selected={!category}
          onPress={() => setCategory(undefined)}
        />
        {PLACE_CATEGORIES.map((item) => (
          <CategoryChip
            key={item}
            label={t(`category.${item}`)}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </ScrollView>

      <View className="px-5 pb-3 pt-3">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t("common.search")}
          left={<Search size={17} color={colors.muted} />}
        />
      </View>

      {places.isPending ? (
        <View className="gap-3 px-5">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </View>
      ) : places.isError ? (
        <ErrorState
          message={apiErrorMessage(places.error, t)}
          onRetry={() => void places.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-60 overflow-hidden rounded-2xl border border-line dark:border-night-line">
            <PlacesMap places={items} selectedId={selectedId} onSelect={selectPlace} />
          </View>

          <View className="mt-2 flex-row items-start gap-2">
            <ShieldAlert size={14} color={colors.muted} style={{ marginTop: 2 }} />
            <Text className="flex-1 font-body text-[11px] leading-4 text-ink-soft dark:text-night-muted">
              {MAP_SAFETY_DISCLAIMER}
            </Text>
          </View>

          {selected ? (
            <Card className="mt-4 gap-3">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
                  <PlaceIcon category={selected.category} color={colors.red} />
                </View>
                <View className="flex-1">
                  <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
                    {selected.name}
                  </Text>
                  <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                    {selected.address ?? t(`category.${selected.category}`)}
                  </Text>
                </View>
                <Badge tone="neutral" label={t(`category.${selected.category}`)} />
              </View>

              {selected.photoUrl ? (
                <Image
                  source={{ uri: mediaUrl(selected.photoUrl) }}
                  resizeMode="cover"
                  style={{ width: "100%", height: 160, borderRadius: 14 }}
                />
              ) : null}

              {selected.description ? (
                <Text className="font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
                  {selected.description}
                </Text>
              ) : null}

              <View className="flex-row flex-wrap gap-2">
                <Button
                  label={t("map.openMaps")}
                  variant="outline"
                  size="sm"
                  leftIcon={<ExternalLink size={14} color={colors.text} />}
                  onPress={() =>
                    void Linking.openURL(
                      selected.googleMapsUrl ??
                        googleMapsUrl(selected.lat, selected.lng, selected.name),
                    )
                  }
                />
                {selected.phone ? (
                  <Button
                    label={t("common.call")}
                    variant="ghost"
                    size="sm"
                    leftIcon={<Phone size={14} color={colors.text} />}
                    onPress={() => void Linking.openURL(`tel:${selected.phone}`)}
                  />
                ) : null}
              </View>

              <Button
                label={t("map.openChat")}
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<MessageCircle size={16} color={colors.text} />}
                onPress={() =>
                  router.push({
                    pathname: "/(client)/place/[id]",
                    params: { id: selected.id },
                  })
                }
              />

              <Button
                label={t("map.requestRide")}
                size="md"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: "/(client)/ride/new",
                    params: {
                      destination: selected.name,
                      destinationLat: String(selected.lat),
                      destinationLng: String(selected.lng),
                    },
                  })
                }
              />
            </Card>
          ) : (
            <Card className="mt-4">
              <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
                {t("map.noPlaces")}
              </Text>
            </Card>
          )}

          <Text className="mb-2 mt-6 font-heading-semi text-base text-ink dark:text-nzila-sand">
            {items.length} {t("nav.map").toLowerCase()}
          </Text>
          <View className="gap-2">
            {items.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onPress={() => selectPlace(place)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-9 items-center justify-center rounded-full border px-4",
        selected
          ? "border-nzila-red bg-nzila-red"
          : "border-line bg-surface dark:border-night-line dark:bg-coal",
      )}
    >
      <Text
        className={cn(
          "font-body-semi text-xs",
          selected ? "text-white" : "text-ink-soft dark:text-night-muted",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
