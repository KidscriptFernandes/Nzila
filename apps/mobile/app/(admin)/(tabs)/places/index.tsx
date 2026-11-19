import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LogOut, MapPin, Plus } from "lucide-react-native";
import type { PlaceDTO } from "@nzila/shared";
import { PlaceIcon } from "@/components/PlaceCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMe } from "@/features/auth/hooks";
import { useAdminPlaces } from "@/features/places/hooks";
import { mediaUrl } from "@/lib/api";
import { confirmAction } from "@/lib/dialogs";
import { useThemeColors } from "@/lib/theme";
import { useSession } from "@/store/session";

export default function AdminPlacesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const places = useAdminPlaces();
  const signOut = useSession((state) => state.signOut);

  if (me.isPending || !me.data) return <LoadingScreen />;

  const isAdmin = me.data.profile.role === "admin";
  const items = places.data?.items ?? [];

  const confirmSignOut = () => {
    confirmAction({
      title: t("common.signOut"),
      message: t("profile.signOutConfirm"),
      confirmLabel: t("common.signOut"),
      cancelLabel: t("common.back"),
      destructive: true,
      onConfirm: () => void signOut().then(() => router.replace("/(auth)/login")),
    });
  };

  return (
    <Screen
      scroll
      refreshing={places.isRefetching}
      onRefresh={() => void places.refetch()}
      contentContainerClassName="px-5 pb-10"
    >
      <ScreenHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle")}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.signOut")}
            onPress={confirmSignOut}
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal"
          >
            <LogOut size={18} color={colors.text} />
          </Pressable>
        }
      />

      <Card className="mt-1 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-nzila-ocean-soft dark:bg-nzila-ocean/20">
          <MapPin size={18} color={colors.ocean} />
        </View>
        <View className="flex-1">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {me.data.profile.fullName}
          </Text>
          <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
            {isAdmin ? t("admin.roleAdmin") : t("admin.roleAssistant")}
          </Text>
        </View>
        <Badge tone="neutral" label={t("admin.total", { count: items.length })} />
      </Card>

      {isAdmin ? (
        <Button
          label={t("admin.newPlace")}
          fullWidth
          className="mt-4"
          leftIcon={<Plus size={17} color="#FFFFFF" />}
          onPress={() => router.push("/(admin)/places/new")}
        />
      ) : null}

      {places.isPending ? (
        <View className="mt-4 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      ) : places.isError ? (
        <ErrorState message={t("admin.loadError")} onRetry={() => void places.refetch()} />
      ) : items.length === 0 ? (
        <Card className="mt-4">
          <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
            {t("admin.empty")}
          </Text>
        </Card>
      ) : (
        <View className="mt-4 gap-3">
          {items.map((place) => (
            <PlaceRow key={place.id} place={place} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function PlaceRow({ place }: { place: PlaceDTO }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Card className="flex-row gap-3">
      {place.photoUrl ? (
        <Image
          source={{ uri: mediaUrl(place.photoUrl) }}
          resizeMode="cover"
          style={{ width: 74, height: 74, borderRadius: 14 }}
        />
      ) : (
        <View className="h-[74px] w-[74px] items-center justify-center rounded-[14px] bg-nzila-sand dark:bg-night-line">
          <PlaceIcon category={place.category} size={24} color={colors.red} />
        </View>
      )}
      <View className="flex-1 gap-1">
        <View className="flex-row items-start gap-2">
          <Text
            className="flex-1 font-body-semi text-sm text-ink dark:text-nzila-sand"
            numberOfLines={2}
          >
            {place.name}
          </Text>
          <Badge
            tone={place.published ? "green" : "gold"}
            label={place.published ? t("admin.publishedBadge") : t("admin.unpublished")}
          />
        </View>
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t(`category.${place.category}`)}
          {place.address ? ` · ${place.address}` : ""}
        </Text>
        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
        </Text>
      </View>
    </Card>
  );
}
