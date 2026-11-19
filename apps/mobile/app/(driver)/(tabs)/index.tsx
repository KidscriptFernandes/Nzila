import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, Inbox, XCircle } from "lucide-react-native";
import type { RideDTO } from "@nzila/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { RideCard } from "@/components/RideCard";
import { useMe } from "@/features/auth/hooks";
import { useAcceptRide, useDeclineRide, useMyRides } from "@/features/rides/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";

export default function DriverInvitesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const rides = useMyRides(undefined, 100);
  const items = rides.data?.items ?? [];
  const invites = items.filter((ride) => ride.status === "MOTORISTA_PROCURADO");
  const active = items.filter((ride) =>
    ["MOTORISTA_CONFIRMADO", "CLIENTE_CONFIRMADO", "EM_VIAGEM", "PROBLEMA"].includes(
      ride.status,
    ),
  );
  const verification = me.data?.driver?.verification;

  return (
    <Screen
      scroll
      refreshing={rides.isRefetching}
      onRefresh={() => void rides.refetch()}
      contentContainerClassName="w-full max-w-4xl self-center px-5 pb-10"
    >
      <ScreenHeader title={t("driver.homeTitle")} subtitle={t("driver.homeSubtitle")} />

      {verification && verification !== "VERIFICADO" ? (
        <Card
          variant={verification === "REPROVADO" ? "red" : "gold"}
          className="mb-4 gap-2"
        >
          <Badge
            tone={verification === "REPROVADO" ? "red" : "gold"}
            label={t(`verification.${verification}`)}
          />
          <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {verification === "REPROVADO"
              ? t("driver.verificationRejected")
              : t("driver.verificationPendingBody")}
          </Text>
          <Button
            label={t("driver.cycle")}
            variant="outline"
            size="sm"
            onPress={() => router.push("/(driver)/(tabs)/documents")}
          />
        </Card>
      ) : null}

      {active.length ? (
        <View className="mb-5 gap-3">
          <View className="flex-row items-center gap-2">
            <Clock3 size={17} color={colors.red} />
            <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
              {t("driver.current")}
            </Text>
          </View>
          {active.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              language={i18n.language}
              onPress={() =>
                router.push({
                  pathname: "/(driver)/ride/[id]",
                  params: { id: ride.id },
                })
              }
            />
          ))}
        </View>
      ) : null}

      <View className="mb-3 flex-row items-center gap-2">
        <Inbox size={17} color={colors.ocean} />
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("driver.invitations")}
        </Text>
      </View>

      {rides.isPending ? (
        <View className="gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </View>
      ) : rides.isError ? (
        <ErrorState
          message={apiErrorMessage(rides.error, t)}
          onRetry={() => void rides.refetch()}
        />
      ) : invites.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} color={colors.ocean} />}
          title={t("driver.noInvitations")}
          body={t("driver.noInvitationsBody")}
        />
      ) : (
        <View className="gap-3">
          {invites.map((ride) => (
            <InviteCard key={ride.id} ride={ride} language={i18n.language} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function InviteCard({ ride, language }: { ride: RideDTO; language: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const accept = useAcceptRide(ride.id);
  const decline = useDeclineRide(ride.id);

  return (
    <View className="gap-2">
      <RideCard
        ride={ride}
        language={language}
        onPress={() =>
          router.push({
            pathname: "/(driver)/ride/[id]",
            params: { id: ride.id },
          })
        }
      />
      <View className="flex-row gap-2">
        <Button
          label={t("driver.accept")}
          size="sm"
          className="flex-1"
          leftIcon={<CheckCircle2 size={15} color="#FFFFFF" />}
          loading={accept.isPending}
          onPress={() =>
            accept.mutate(undefined, {
              onSuccess: () => {
                notify(t("driver.accepted"));
                router.push({
                  pathname: "/(driver)/ride/[id]",
                  params: { id: ride.id },
                });
              },
              onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
            })
          }
        />
        <Button
          label={t("driver.decline")}
          variant="outline"
          size="sm"
          className="flex-1 border-nzila-red"
          textClassName="text-nzila-red"
          leftIcon={<XCircle size={15} color={colors.red} />}
          loading={decline.isPending}
          onPress={() =>
            confirmAction({
              title: t("driver.decline"),
              message: t("driver.declineConfirm"),
              confirmLabel: t("driver.decline"),
              cancelLabel: t("common.back"),
              destructive: true,
              onConfirm: () =>
                decline.mutate(
                  {},
                  {
                    onSuccess: () => notify(t("driver.declined")),
                    onError: (error) =>
                      notify(t("common.error"), apiErrorMessage(error, t)),
                  },
                ),
            })
          }
        />
      </View>
    </View>
  );
}
