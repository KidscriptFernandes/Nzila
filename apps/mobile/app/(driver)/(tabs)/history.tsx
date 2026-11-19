import { FlatList, Text, View } from "react-native";
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

export default function DriverHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const rides = useMyRides(undefined, 200);
  const items = (rides.data?.items ?? []).filter((ride) =>
    ["CONCLUIDO", "CANCELADO"].includes(ride.status),
  );

  return (
    <Screen>
      <ScreenHeader title={t("driver.history")} subtitle={t("driver.historySubtitle")} />

      {rides.isPending ? (
        <View className="w-full max-w-4xl self-center gap-3 px-5">
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
            maxWidth: 896,
            alignSelf: "center",
            paddingHorizontal: 20,
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
                  pathname: "/(driver)/ride/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<History size={28} color={colors.baobab} />}
              title={t("driver.noRides")}
              body={t("driver.rideHistory")}
            />
          }
        />
      )}
    </Screen>
  );
}
