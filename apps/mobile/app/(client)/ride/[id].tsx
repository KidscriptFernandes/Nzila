import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatKz } from "@nzila/shared";
import {
  BadgeCheck,
  Car,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { RatingStars } from "@/components/ui/RatingStars";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StepperTimeline } from "@/components/ui/StepperTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedSeal } from "@/components/ui/VerifiedSeal";
import { useConfirmRide, useCancelRide, useRateRide, useRide, useRideRealtime } from "@/features/rides/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateTime, whatsappUrl } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CLIENT_CANCELLABLE = new Set([
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "SEM_MOTORISTA",
]);

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default function ClientRideDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = asString(params.id);
  const rideQuery = useRide(id);
  useRideRealtime(id);

  const confirm = useConfirmRide(id);
  const cancel = useCancelRide(id);
  const rate = useRateRide(id);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);

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
  const canCancel = CLIENT_CANCELLABLE.has(ride.status);
  const confirmable = ride.status === "MOTORISTA_CONFIRMADO";
  const priceReady =
    ride.priceKz != null &&
    Boolean(ride.cancellationPolicy) &&
    Boolean(ride.cancellationPolicyCommunicatedAt);

  const messageForRide = `Olá Nzila! Preciso de ajuda com a corrida ${ride.reference}.`;

  const submitRating = () => {
    if (stars < 1) return;
    rate.mutate(
      {
        stars,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(recommend !== null ? { wouldRecommend: recommend } : {}),
      },
      {
        onSuccess: () => notify(t("rideDetail.ratingThanks")),
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Screen
      scroll
      refreshing={rideQuery.isRefetching}
      onRefresh={() => void rideQuery.refetch()}
      contentContainerClassName="pb-10"
    >
      <ScreenHeader back title={t("rideDetail.title")} />

      <View className="px-5">
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

        <View className="flex-row flex-wrap items-center gap-2 border-t border-line pt-3 dark:border-night-line">
          <Badge tone="neutral" label={t("units.passengers", { count: ride.passengers })} />
          <Badge tone="neutral" label={t("units.luggage", { count: ride.luggage })} />
          {ride.priority !== "NORMAL" ? (
            <Badge tone="gold" label={t(`priority.${ride.priority}`)} />
          ) : null}
        </View>
      </Card>

      {ride.status === "NOVO" ? (
        <Card variant="gold" className="mt-4">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {t("rideDetail.newTitle")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("rideDetail.newBody")}
          </Text>
        </Card>
      ) : null}

      {ride.status === "MOTORISTA_PROCURADO" || ride.status === "SEM_MOTORISTA" ? (
        <Card variant="ocean" className="mt-4">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {t("rideDetail.noDriverTitle")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("rideDetail.noDriverBody")}
          </Text>
        </Card>
      ) : null}

      {ride.status === "PROBLEMA" ? (
        <Card variant="red" className="mt-4">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {t("rideDetail.problemTitle")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("rideDetail.problemBody")}
          </Text>
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

      {ride.driver ? (
        <Card className="mt-4 gap-3">
          <Text className="font-body-semi text-xs uppercase tracking-wide text-ink-soft dark:text-night-muted">
            {t("rideDetail.driver")}
          </Text>
          <View className="flex-row items-center gap-3">
            <Avatar name={ride.driver.fullName} size={46} />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-body-semi text-base text-ink dark:text-nzila-sand">
                  {ride.driver.fullName}
                </Text>
                {ride.driver.verified ? <VerifiedSeal /> : null}
              </View>
              <View className="mt-1 flex-row items-center gap-1.5">
                <Star size={13} color={colors.gold} fill={colors.gold} />
                <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                  {Number(ride.driver.ratingAvg).toFixed(1)}
                  {ride.driver.ratingCount > 0 ? ` · ${ride.driver.ratingCount}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {ride.driver.vehicle ? (
            <View className="flex-row items-center gap-3 rounded-2xl bg-nzila-sand p-3 dark:bg-night-line">
              <Car size={20} color={colors.text} />
              <View className="flex-1">
                <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                  {ride.driver.vehicle.make} {ride.driver.vehicle.model}
                </Text>
                <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                  {ride.driver.vehicle.color} · {ride.driver.vehicle.seats}{" "}
                  {t("rideForm.passengers").toLowerCase()}
                </Text>
              </View>
              <Badge tone="dark" label={ride.driver.vehicle.plate} />
            </View>
          ) : null}

          {ride.driver.whatsapp ? (
            <View className="flex-row gap-2">
              <Button
                label={t("common.call")}
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<Phone size={14} color={colors.text} />}
                onPress={() => void Linking.openURL(`tel:${ride.driver?.whatsapp}`)}
              />
              <Button
                label="WhatsApp"
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<MessageCircle size={14} color={colors.text} />}
                onPress={() =>
                  void Linking.openURL(
                    whatsappUrl(`Olá! Sobre a corrida ${ride.reference} em Luanda.`),
                  )
                }
              />
            </View>
          ) : (
            <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
              {t("rideDetail.contactUnavailable")}
            </Text>
          )}
        </Card>
      ) : null}

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {t("rideDetail.price")}
          </Text>
          {ride.priceConfirmedAt ? (
            <Badge tone="green" label={t("rideDetail.priceConfirmed")} />
          ) : null}
        </View>
        <Text
          className={cn(
            "font-heading text-2xl",
            ride.priceKz != null ? "text-ink dark:text-nzila-sand" : "text-ink-soft dark:text-night-muted",
          )}
        >
          {ride.priceKz != null ? formatKz(ride.priceKz) : t("rideDetail.pricePending")}
        </Text>

        {ride.cancellationPolicy ? (
          <View className="gap-1 border-t border-line pt-3 dark:border-night-line">
            <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
              {t("rideDetail.cancellationPolicy")}
            </Text>
            <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {ride.cancellationPolicy}
            </Text>
          </View>
        ) : null}

        {confirmable ? (
          <>
            {!priceReady ? (
              <Text className="font-body text-xs text-nzila-red">
                {t("rideDetail.confirmWaitingPolicy")}
              </Text>
            ) : null}
            <Button
              label={confirm.isPending ? t("rideDetail.confirming") : t("rideDetail.confirm")}
              size="lg"
              fullWidth
              disabled={!priceReady}
              loading={confirm.isPending}
              onPress={() =>
                confirm.mutate(undefined, {
                  onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
                })
              }
            />
          </>
        ) : null}

        {ride.status === "EM_VIAGEM" ? (
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {t("rideDetail.cancelNotAllowed")}
          </Text>
        ) : null}

        {canCancel ? (
          <Button
            label={t("rideDetail.cancel")}
            variant="outline"
            size="md"
            fullWidth
            className="border-nzila-red"
            textClassName="text-nzila-red"
            loading={cancel.isPending}
            onPress={() =>
              confirmAction({
                title: t("rideDetail.cancel"),
                message: t("rideDetail.cancelConfirm"),
                confirmLabel: t("rideDetail.cancel"),
                cancelLabel: t("common.back"),
                destructive: true,
                onConfirm: () =>
                  cancel.mutate(
                    {},
                    {
                      onError: (error) =>
                        notify(t("common.error"), apiErrorMessage(error, t)),
                    },
                  ),
              })
            }
          />
        ) : null}
      </Card>

      {ride.events?.length ? (
        <Card className="mt-4">
          <StepperTimeline status={ride.status} events={ride.events} locale={i18n.language} />
        </Card>
      ) : null}

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

      {ride.status === "CONCLUIDO" ? (
        <Card className="mt-4 gap-3">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {ride.rating ? t("rideDetail.myRating") : t("rideDetail.ratingTitle")}
          </Text>
          {ride.rating ? (
            <>
              <RatingStars value={ride.rating.stars} readOnly size={22} />
              {ride.rating.comment ? (
                <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
                  {ride.rating.comment}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
                {t("rideDetail.ratingBody")}
              </Text>
              <RatingStars value={stars} onChange={setStars} />
              <Input
                label={t("rideDetail.comment")}
                value={comment}
                onChangeText={setComment}
                placeholder={t("rideDetail.comment")}
                multiline
                maxLength={500}
              />
              <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
                {t("rideDetail.recommend")}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setRecommend(true)}
                  className={cn(
                    "rounded-full border px-4 py-2",
                    recommend === true
                      ? "border-nzila-baobab bg-nzila-baobab-soft dark:bg-nzila-baobab/20"
                      : "border-line dark:border-night-line",
                  )}
                >
                  <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
                    {t("common.yes")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRecommend(false)}
                  className={cn(
                    "rounded-full border px-4 py-2",
                    recommend === false
                      ? "border-nzila-clay bg-nzila-clay-soft dark:bg-nzila-clay/20"
                      : "border-line dark:border-night-line",
                  )}
                >
                  <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
                    {t("common.no")}
                  </Text>
                </Pressable>
              </View>
              <Button
                label={t("rideDetail.submitRating")}
                fullWidth
                loading={rate.isPending}
                disabled={stars < 1}
                onPress={submitRating}
              />
            </>
          )}
        </Card>
      ) : null}

      <Button
        label={t("rideDetail.support")}
        variant="ghost"
        leftIcon={<UserRound size={16} color={colors.red} />}
        className="mt-4"
        onPress={() =>
          router.push({
            pathname: "/(client)/help",
            params: { rideId: ride.id, reference: ride.reference },
          })
        }
      />
      <Button
        label={t("rideDetail.helpWhatsapp")}
        variant="ghost"
        leftIcon={<MessageCircle size={16} color={colors.ocean} />}
        onPress={() => void Linking.openURL(whatsappUrl(messageForRide))}
      />
      {ride.paymentStatus === "PAGO" ? (
        <View className="mt-4 flex-row items-center justify-center gap-2">
          <BadgeCheck size={16} color={colors.baobab} />
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {t("rideDetail.paid")}
          </Text>
        </View>
      ) : null}
      </View>
    </Screen>
  );
}
