import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { RideCard } from "@/components/RideCard";
import { useMyRides } from "@/features/rides/hooks";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "completed" | "cancelled";

const ACTIVE = new Set([
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "SEM_MOTORISTA",
  "PROBLEMA",
]);

export default function ClientRidesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<Filter>("all");
  const rides = useMyRides(undefined, 100);

  const items = (rides.data?.items ?? []).filter((ride) => {
    if (filter === "active") return ACTIVE.has(ride.status);
    if (filter === "completed") return ride.status === "CONCLUIDO";
    if (filter === "cancelled") return ride.status === "CANCELADO";
    return true;
  });

  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: t("history.all") },
    { value: "active", label: t("history.active") },
    { value: "completed", label: t("history.completed") },
    { value: "cancelled", label: t("history.cancelled") },
  ];

  return (
    <Screen>
      <ScreenHeader title={t("history.title")} subtitle={t("history.subtitle")} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12"
        contentContainerClassName="gap-2 px-5"
      >
        {filters.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setFilter(item.value)}
            className={cn(
              "h-9 items-center justify-center rounded-full border px-4",
              filter === item.value
                ? "border-nzila-red bg-nzila-red"
                : "border-line bg-surface dark:border-night-line dark:bg-coal",
            )}
          >
            <Text
              className={cn(
                "font-body-semi text-xs",
                filter === item.value
                  ? "text-white"
                  : "text-ink-soft dark:text-night-muted",
              )}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {rides.isPending ? (
        <View className="gap-3 px-5 pt-4">
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
          contentContainerClassName="gap-3 px-5 pb-8 pt-4"
          showsVerticalScrollIndicator={false}
          refreshing={rides.isRefetching}
          onRefresh={() => void rides.refetch()}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              language={i18n.language}
              onPress={() => router.push(`/(client)/ride/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<History size={28} color={colors.red} />}
              title={t("history.emptyTitle")}
              body={t("history.emptyBody")}
              actionLabel={t("history.newRide")}
              onAction={() => router.push("/(client)/ride/new")}
            />
          }
        />
      )}
    </Screen>
  );
}
