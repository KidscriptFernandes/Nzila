import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatKz } from "@nzila/shared";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StepperTimeline } from "@/components/ui/StepperTimeline";
import {
  useAcceptRide,
  useArrivedRide,
  useCompleteRide,
  useDeclineRide,
  useRide,
  useRideRealtime,
  useStartRide,
} from "@/features/rides/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateTime, whatsappUrl } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default function DriverRideDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = asString(params.id);
  const rideQuery = useRide(id);
  useRideRealtime(id);

  const accept = useAcceptRide(id);
  const decline = useDeclineRide(id);
  const arrived = useArrivedRide(id);
  const start = useStartRide(id);
  const complete = useCompleteRide(id);

  if (rideQuery.isPending) return <LoadingScreen />;
  if (rideQuery.isError || !rideQuery.data) {
    return (
      <Screen>
        <ScreenHeader back title={t("rideDetail.title")} />
        <ErrorState
          message={apiErrorMessage(rideQuery.error, t)}
          onRetry={() => void rideQuery.refetch()}
        />
      </Screen>
    );
  }

  const ride = rideQuery.data;
  const pending = ride.status === "MOTORISTA_PROCURADO";
  const accepted = ride.status === "MOTORISTA_CONFIRMADO";
  const confirmed = ride.status === "CLIENTE_CONFIRMADO";
  const travelling = ride.status === "EM_VIAGEM";
  const supportMessage = `Olá Nzila! Preciso de ajuda com a corrida ${ride.reference}.`;

  const onError = (error: unknown) => notify(t("common.error"), apiErrorMessage(error, t));

  return (
    <Screen
      scroll
      refreshing={rideQuery.isRefetching}
      onRefresh={() => void rideQuery.refetch()}
      contentContainerClassName="w-full max-w-3xl self-center px-5 pb-12"
    >
      <ScreenHeader back title={t("rideDetail.title")} />

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-semi text-xs uppercase tracking-[1px] text-ink-soft dark:text-night-muted">
            {ride.reference}
          </Text>
          <StatusBadge status={ride.status} />
        </View>
        <Text className="font-heading text-2xl tracking-tight text-ink dark:text-nzila-sand">
          {formatDateTime(ride.scheduledAt, i18n.language)}
        </Text>

        <View className="gap-2 border-t border-line pt-3 dark:border-night-line">
          <View className="flex-row items-start gap-2">
            <View className="mt-1.5 h-2 w-2 rounded-full bg-nzila-ocean" />
            <View className="flex-1">
              <Text className="font-body text-[11px] uppercase tracking-wide text-ink-soft dark:text-night-muted">
                {t("rideDetail.from")}
              </Text>
              <Text className="font-body text-sm text-ink dark:text-nzila-sand">
                {ride.origin}
              </Text>
            </View>
          </View>
          <View className="ml-0.5 h-3 w-px bg-line dark:bg-night-line" />
          <View className="flex-row items-start gap-2">
            <MapPin size={14} color={colors.red} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="font-body text-[11px] uppercase tracking-wide text-ink-soft dark:text-night-muted">
                {t("rideDetail.to")}
              </Text>
              <Text className="font-body text-sm text-ink dark:text-nzila-sand">
                {ride.destination}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Badge tone="neutral" label={t("units.passengers", { count: ride.passengers })} />
          <Badge tone="neutral" label={t("units.luggage", { count: ride.luggage })} />
          {ride.priority !== "NORMAL" ? (
            <Badge tone="gold" label={t(`priority.${ride.priority}`)} />
          ) : null}
          <Badge tone="ocean" label={formatKz(ride.priceKz)} />
        </View>
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center gap-2">
          <UserRound size={16} color={colors.ocean} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("driver.customer")}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Avatar name={ride.customerName} size={44} />
          <View className="flex-1">
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {ride.customerName}
            </Text>
            {ride.customerPhone ? (
              <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
                {ride.customerPhone}
              </Text>
            ) : null}
          </View>
        </View>
        {ride.customerPhone ? (
          <View className="flex-row gap-2">
            <Button
              label={t("common.call")}
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<Phone size={14} color={colors.text} />}
              onPress={() => void Linking.openURL(`tel:${ride.customerPhone}`)}
            />
            <Button
              label="WhatsApp"
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<MessageCircle size={14} color={colors.ocean} />}
              onPress={() =>
                void Linking.openURL(
                  `https://wa.me/${ride.customerPhone?.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    `Olá! Sou o motorista Nzila da corrida ${ride.reference}.`,
                  )}`,
                )
              }
            />
          </View>
        ) : (
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {t("driver.customerPhoneUnavailable")}
          </Text>
        )}
      </Card>

      {ride.notes ? (
        <Card className="mt-4">
          <Text className="font-body-semi text-xs uppercase tracking-wide text-ink-soft dark:text-night-muted">
            {t("rideDetail.notes")}
          </Text>
          <Text className="mt-2 font-body text-sm leading-5 text-ink dark:text-nzila-sand">
            {ride.notes}
          </Text>
        </Card>
      ) : null}

      <Card className="mt-4 gap-3">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("adminRides.operations")}
        </Text>

        {pending ? (
          <View className="flex-row flex-wrap gap-2">
            <Button
              label={t("driver.accept")}
              size="sm"
              className="flex-1"
              loading={accept.isPending}
              leftIcon={<CheckCircle2 size={15} color="#FFFFFF" />}
              onPress={() =>
                accept.mutate(undefined, {
                  onSuccess: () => notify(t("driver.accepted")),
                  onError,
                })
              }
            />
            <Button
              label={t("driver.decline")}
              variant="outline"
              size="sm"
              className="flex-1 border-nzila-red"
              textClassName="text-nzila-red"
              loading={decline.isPending}
              leftIcon={<XCircle size={15} color={colors.red} />}
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
                        onSuccess: () => {
                          notify(t("driver.declined"));
                          router.replace("/(driver)/(tabs)");
                        },
                        onError,
                      },
                    ),
                })
              }
            />
          </View>
        ) : null}

        {accepted ? (
          <View className="gap-2">
            <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {t("driver.waitingClient")}
            </Text>
            <Button
              label={t("driver.arrived")}
              fullWidth
              loading={arrived.isPending}
              leftIcon={<Navigation size={16} color="#FFFFFF" />}
              onPress={() =>
                arrived.mutate(undefined, {
                  onSuccess: () => notify(t("driver.arrivedSent")),
                  onError,
                })
              }
            />
          </View>
        ) : null}

        {confirmed ? (
          <View className="gap-2">
            <Button
              label={t("driver.arrived")}
              variant="outline"
              fullWidth
              loading={arrived.isPending}
              leftIcon={<Navigation size={16} color={colors.text} />}
              onPress={() =>
                arrived.mutate(undefined, {
                  onSuccess: () => notify(t("driver.arrivedSent")),
                  onError,
                })
              }
            />
            <Button
              label={t("driver.start")}
              fullWidth
              loading={start.isPending}
              leftIcon={<Play size={16} color="#FFFFFF" />}
              onPress={() =>
                start.mutate(undefined, {
                  onSuccess: () => notify(t("rideDetail.started")),
                  onError,
                })
              }
            />
          </View>
        ) : null}

        {travelling ? (
          <Button
            label={t("driver.complete")}
            fullWidth
            loading={complete.isPending}
            leftIcon={<CheckCircle2 size={16} color="#FFFFFF" />}
            onPress={() =>
              confirmAction({
                title: t("driver.complete"),
                message: t("rideDetail.completeConfirm"),
                confirmLabel: t("driver.complete"),
                cancelLabel: t("common.back"),
                onConfirm: () =>
                  complete.mutate(undefined, {
                    onSuccess: () => {
                      notify(t("rideDetail.completed"));
                      router.replace("/(driver)/(tabs)/history");
                    },
                    onError,
                  }),
              })
            }
          />
        ) : null}

        {ride.status === "CONCLUIDO" || ride.status === "CANCELADO" ? (
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {t(`status.${ride.status}`)}
          </Text>
        ) : null}
      </Card>

      {ride.cancellationPolicy ? (
        <Card className="mt-4">
          <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
            {t("rideDetail.cancellationPolicy")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {ride.cancellationPolicy}
          </Text>
        </Card>
      ) : null}

      {ride.events?.length ? (
        <Card className="mt-4">
          <StepperTimeline
            status={ride.status}
            events={ride.events}
            locale={i18n.language}
          />
        </Card>
      ) : null}

      {ride.status === "EM_VIAGEM" ? (
        <Card variant="red" className="mt-4 flex-row items-start gap-2">
          <ShieldAlert size={18} color={colors.red} style={{ marginTop: 1 }} />
          <Text className="flex-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("rideDetail.activeSafety")}
          </Text>
        </Card>
      ) : null}

      <Button
        label={t("rideDetail.helpWhatsapp")}
        variant="ghost"
        className="mt-4"
        leftIcon={<MessageCircle size={16} color={colors.ocean} />}
        onPress={() => void Linking.openURL(whatsappUrl(supportMessage))}
      />
    </Screen>
  );
}
