import { useEffect, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  ChevronRight,
  LifeBuoy,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlaceCompactCard } from "@/components/PlaceCard";
import { Wordmark } from "@/components/Brand";
import { useMe } from "@/features/auth/hooks";
import { usePlaces } from "@/features/places/hooks";
import { useMyRides } from "@/features/rides/hooks";
import { formatDateTime, greetingKey, whatsappUrl } from "@/lib/format";
import { registerForPushNotifications } from "@/lib/notifications";
import { useThemeColors } from "@/lib/theme";
import { firstName } from "@/lib/utils";
import { useSettings } from "@/store/settings";

const ACTIVE_STATUSES = new Set([
  "NOVO",
  "EM_ANALISE",
  "MOTORISTA_PROCURADO",
  "MOTORISTA_CONFIRMADO",
  "CLIENTE_CONFIRMADO",
  "EM_VIAGEM",
  "SEM_MOTORISTA",
  "PROBLEMA",
]);

const ESSENTIAL_CATEGORIES = new Set(["ATM", "FARMACIA", "HOSPITAL", "AEROPORTO", "BANCO"]);

export default function ClientHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = i18n.language;
  const me = useMe();
  const rides = useMyRides();
  const places = usePlaces();
  const pushEnabled = useSettings((state) => state.pushEnabled);

  useEffect(() => {
    if (pushEnabled) void registerForPushNotifications().catch(() => undefined);
  }, [pushEnabled]);

  const onRefresh = () => {
    void me.refetch();
    void rides.refetch();
    void places.refetch();
  };

  if (me.isPending || !me.data) return <LoadingScreen />;

  const nextRide = [...(rides.data?.items ?? [])]
    .filter((ride) => ACTIVE_STATUSES.has(ride.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  const essentials = (places.data?.items ?? [])
    .filter((place) => ESSENTIAL_CATEGORIES.has(place.category))
    .slice(0, 6);

  return (
    <Screen
      scroll
      refreshing={me.isRefetching || rides.isRefetching || places.isRefetching}
      onRefresh={onRefresh}
      contentContainerClassName="px-5 pb-8"
    >
      <View className="flex-row items-center justify-between pt-2">
        <Wordmark />
        <Pressable onPress={() => router.push("/(client)/(tabs)/profile")} hitSlop={6}>
          <Avatar name={me.data.profile.fullName} size={42} />
        </Pressable>
      </View>

      <View className="mt-7">
        <Text className="font-heading text-[28px] leading-9 tracking-tight text-ink dark:text-nzila-sand">
          {t(greetingKey(), { name: firstName(me.data.profile.fullName) })}
        </Text>
        <Text className="mt-1 font-body text-sm text-ink-soft dark:text-night-muted">
          {t("home.subtitle")}
        </Text>
      </View>

      <View className="mt-6">
        <SectionTitle
          title={t("home.nextRide")}
          action={
            nextRide ? (
              <Pressable onPress={() => router.push("/(client)/(tabs)/rides")}>
                <Text className="font-body-semi text-xs text-nzila-red">{t("common.seeAll")}</Text>
              </Pressable>
            ) : undefined
          }
        />

        {nextRide ? (
          <Card
            className="mt-3 gap-3 border-nzila-red/30"
            onPress={() => router.push(`/(client)/ride/${nextRide.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <StatusBadge status={nextRide.status} />
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {formatDateTime(nextRide.scheduledAt, language)}
              </Text>
            </View>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-nzila-ocean" />
                <Text className="flex-1 font-body text-sm text-ink dark:text-nzila-sand" numberOfLines={1}>
                  {nextRide.origin}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <MapPin size={14} color={colors.red} />
                <Text className="flex-1 font-body text-sm text-ink dark:text-nzila-sand" numberOfLines={1}>
                  {nextRide.destination}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between border-t border-line pt-3 dark:border-night-line">
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {nextRide.status === "NOVO" ? t("rideDetail.newTitle") : nextRide.reference}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="font-body-semi text-xs text-nzila-red">
                  {t("home.viewRide")}
                </Text>
                <ChevronRight size={15} color={colors.red} />
              </View>
            </View>
          </Card>
        ) : (
          <Card className="mt-3 items-start gap-2">
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("home.noUpcoming")}
            </Text>
            <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {t("home.noUpcomingBody")}
            </Text>
          </Card>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(client)/ride/new")}
        className="mt-5 flex-row items-center gap-4 rounded-3xl bg-nzila-red p-5 active:opacity-90"
      >
        <View className="flex-1">
          <Text className="font-heading text-xl text-white">{t("home.newRide")}</Text>
          <Text className="mt-1 font-body text-sm leading-5 text-white/80">
            {t("home.newRideBody")}
          </Text>
        </View>
        <View className="h-14 w-14 items-center justify-center rounded-full bg-nzila-gold">
          <CarFront size={26} color="#0D0D0D" />
        </View>
      </Pressable>

      <View className="mt-4 flex-row gap-3">
        <QuickAction
          icon={<MessageCircle size={20} color={colors.ocean} />}
          title={t("home.assistant")}
          subtitle={t("home.assistantBody")}
          onPress={() => void Linking.openURL(whatsappUrl())}
        />
        <QuickAction
          icon={<MapPin size={20} color={colors.gold} />}
          title={t("home.usefulMap")}
          subtitle={t("home.usefulMapBody")}
          onPress={() => router.push("/(client)/(tabs)/map")}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <QuickAction
          icon={<LifeBuoy size={20} color={colors.red} />}
          title={t("home.urgentHelp")}
          subtitle={t("home.urgentHelpBody")}
          onPress={() => router.push("/(client)/help")}
        />
        <QuickAction
          icon={<ShieldCheck size={20} color={colors.baobab} />}
          title={t("home.trustTitle")}
          subtitle={t("home.supportBody")}
          onPress={() => router.push("/(client)/help")}
        />
      </View>

      <Card variant="gold" className="mt-5 flex-row items-start gap-3">
        <BadgeCheck size={22} color="#B8860B" style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {t("home.pricePromise")}
          </Text>
          <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("home.pricePromiseBody")}
          </Text>
        </View>
      </Card>

      {essentials.length ? (
        <View className="mt-7">
          <SectionTitle
            title={t("home.essentials")}
            subtitle={t("home.essentialsSubtitle")}
            action={
              <Pressable onPress={() => router.push("/(client)/(tabs)/map")}>
                <Text className="font-body-semi text-xs text-nzila-red">{t("common.seeAll")}</Text>
              </Pressable>
            }
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pt-3"
          >
            {essentials.map((place) => (
              <PlaceCompactCard
                key={place.id}
                place={place}
                onPress={() =>
                  router.push({
                    pathname: "/(client)/(tabs)/map",
                    params: { category: place.category },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Card className="mt-6 flex-row items-start gap-3">
        <ShieldCheck size={20} color={colors.ocean} style={{ marginTop: 2 }} />
        <Text className="flex-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
          {t("home.trustBody")}
        </Text>
      </Card>

      <Pressable
        onPress={() => router.push("/(client)/help")}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 dark:border-night-line dark:bg-coal"
      >
        <MessageCircle size={16} color={colors.red} />
        <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
          {t("home.needSupport")}
        </Text>
        <ArrowRight size={15} color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-1 gap-2 p-4">
      <View className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
        {icon}
      </View>
      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">{title}</Text>
      <Text className="font-body text-[11px] leading-4 text-ink-soft dark:text-night-muted">
        {subtitle}
      </Text>
    </Card>
  );
}
