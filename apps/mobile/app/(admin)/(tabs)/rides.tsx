import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CarFront } from "lucide-react-native";
import { RIDE_STATUSES, type RideStatus } from "@nzila/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { RideCard } from "@/components/RideCard";
import { useAdminRideQueue } from "@/features/admin/hooks";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function AdminRidesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const [status, setStatus] = useState<RideStatus | undefined>(undefined);
  const rides = useAdminRideQueue({ status, limit: 200 });
  const items = rides.data?.items ?? [];

  return (
    <Screen>
      <ScreenHeader title={t("adminRides.title")} subtitle={t("adminRides.subtitle")} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 shrink-0"
        contentContainerClassName="gap-2 px-5"
      >
        <FilterChip
          label={t("common.all")}
          selected={!status}
          onPress={() => setStatus(undefined)}
        />
        {RIDE_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={`${t(`status.${value}`)}${rides.data?.counts[value] ? ` · ${rides.data.counts[value]}` : ""}`}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </ScrollView>

      <View className="w-full max-w-5xl self-center px-5 pb-3 pt-3">
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("adminRides.todayCount", { count: rides.data?.today ?? 0 })}
        </Text>
      </View>

      {rides.isPending ? (
        <View className="w-full max-w-5xl self-center gap-3 px-5">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-44 w-full" />
          ))}
        </View>
      ) : rides.isError ? (
        <ErrorState
          message={apiErrorMessage(rides.error, t)}
          onRetry={() => void rides.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            width: "100%",
            maxWidth: 1024,
            alignSelf: "center",
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 32,
            gap: 12,
          }}
          refreshing={rides.isRefetching}
          onRefresh={() => void rides.refetch()}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              language={i18n.language}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/rides/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<CarFront size={28} color={colors.red} />}
              title={t("adminRides.emptyTitle")}
              body={t("adminRides.emptyBody")}
            />
          }
        />
      )}
    </Screen>
  );
}

function FilterChip({
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
