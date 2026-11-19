import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BadgeCheck,
  CarFront,
  Clock3,
  LifeBuoy,
  LogOut,
  MapPin,
  ShieldAlert,
  Star,
  Users,
} from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useMe } from "@/features/auth/hooks";
import {
  useAdminMetrics,
  useAdminRideQueue,
  useAdminSupport,
} from "@/features/admin/hooks";
import { confirmAction } from "@/lib/dialogs";
import { useThemeColors } from "@/lib/theme";
import { useSession } from "@/store/session";

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const signOut = useSession((state) => state.signOut);

  if (me.isPending || !me.data) return <LoadingScreen />;

  const isAdmin = me.data.profile.role === "admin";

  return (
    <Screen
      scroll
      contentContainerClassName="w-full max-w-5xl self-center px-5 pb-10"
    >
      <ScreenHeader
        title={t("adminPanel.title")}
        subtitle={t("adminPanel.subtitle")}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.signOut")}
            onPress={() =>
              confirmAction({
                title: t("common.signOut"),
                message: t("profile.signOutConfirm"),
                confirmLabel: t("common.signOut"),
                cancelLabel: t("common.back"),
                destructive: true,
                onConfirm: () => void signOut().then(() => router.replace("/(auth)/login")),
              })
            }
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal"
          >
            <LogOut size={18} color={colors.text} />
          </Pressable>
        }
      />

      <Card className="flex-row items-center gap-3">
        <Avatar name={me.data.profile.fullName} size={46} />
        <View className="flex-1">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {me.data.profile.fullName}
          </Text>
          <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
            {isAdmin ? t("admin.roleAdmin") : t("admin.roleAssistant")}
          </Text>
        </View>
        <Badge tone="ocean" label={t("adminPanel.operations")} />
      </Card>

      <AdminOverview isAdmin={isAdmin} />

      <Text className="mb-2 mt-6 font-heading-semi text-base text-ink dark:text-nzila-sand">
        {t("adminPanel.shortcuts")}
      </Text>

      <View className="flex-row flex-wrap gap-3">
        <Shortcut
          icon={<CarFront size={20} color={colors.red} />}
          title={t("adminPanel.rides")}
          body={t("adminPanel.ridesBody")}
          onPress={() => router.push("/(admin)/(tabs)/rides")}
        />
        <Shortcut
          icon={<Users size={20} color={colors.ocean} />}
          title={t("adminPanel.drivers")}
          body={t("adminPanel.driversBody")}
          onPress={() => router.push("/(admin)/(tabs)/drivers")}
        />
        <Shortcut
          icon={<LifeBuoy size={20} color={colors.gold} />}
          title={t("adminPanel.support")}
          body={t("adminPanel.supportBody")}
          onPress={() => router.push("/(admin)/(tabs)/support")}
        />
        <Shortcut
          icon={<MapPin size={20} color={colors.baobab} />}
          title={t("adminPanel.places")}
          body={t("adminPanel.placesBody")}
          onPress={() => router.push("/(admin)/(tabs)/places")}
        />
      </View>

      <Card className="mt-5 flex-row items-start gap-3">
        <ShieldAlert size={18} color={colors.clay} style={{ marginTop: 2 }} />
        <Text className="flex-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
          {t("adminPanel.caution")}
        </Text>
      </Card>
    </Screen>
  );
}

function AdminOverview({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const metrics = useAdminMetrics(isAdmin);
  const rides = useAdminRideQueue({ limit: 100 });
  const support = useAdminSupport({ limit: 100 });

  const openSupport =
    support.data?.items.filter((item) => item.status !== "RESOLVIDO").length ?? 0;
  const urgentSupport =
    support.data?.items.filter(
      (item) => item.status !== "RESOLVIDO" && item.priority === "URGENTE",
    ).length ?? 0;

  if (isAdmin && metrics.isPending) {
    return (
      <Card className="mt-4">
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
          {t("common.loading")}
        </Text>
      </Card>
    );
  }

  const data = isAdmin ? metrics.data : undefined;

  return (
    <>
      <Card className="mt-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("adminPanel.pulse")}
          </Text>
          <Badge tone="gold" label={t("adminPanel.live")} />
        </View>
        <View className="flex-row flex-wrap gap-3">
          <Metric
            icon={<Activity size={17} color={colors.red} />}
            label={t("adminPanel.today")}
            value={String(data?.requestsToday ?? rides.data?.today ?? 0)}
          />
          <Metric
            icon={<LifeBuoy size={17} color={colors.gold} />}
            label={t("adminPanel.openSupport")}
            value={String(data?.supportOpen ?? openSupport)}
            hint={urgentSupport ? t("adminPanel.urgentCount", { count: urgentSupport }) : undefined}
          />
          <Metric
            icon={<CarFront size={17} color={colors.ocean} />}
            label={t("adminPanel.activeRides")}
            value={String(
              (rides.data?.counts.MOTORISTA_PROCURADO ?? 0) +
                (rides.data?.counts.MOTORISTA_CONFIRMADO ?? 0) +
                (rides.data?.counts.CLIENTE_CONFIRMADO ?? 0) +
                (rides.data?.counts.EM_VIAGEM ?? 0),
            )}
          />
          <Metric
            icon={<Users size={17} color={colors.baobab} />}
            label={t("adminPanel.verifiedDrivers")}
            value={
              data
                ? `${data.driversVerified}/${data.driversCandidates}`
                : t("common.unknown")
            }
          />
        </View>
      </Card>

      {data ? (
        <View className="mt-4 flex-row flex-wrap gap-3">
          <MetricCard
            icon={<BadgeCheck size={18} color={colors.baobab} />}
            label={t("adminPanel.confirmedTotal")}
            value={String(data.confirmedTotal)}
          />
          <MetricCard
            icon={<Star size={18} color={colors.gold} />}
            label={t("adminPanel.ratingAverage")}
            value={data.ratingsAvg ? data.ratingsAvg.toFixed(1) : t("common.unknown")}
            hint={
              data.recommendRate
                ? t("adminPanel.recommendRate", {
                    percent: Math.round(data.recommendRate * 100),
                  })
                : undefined
            }
          />
          <MetricCard
            icon={<Clock3 size={18} color={colors.ocean} />}
            label={t("adminPanel.avgAssignment")}
            value={
              data.avgMinutesToDriver == null
                ? t("common.unknown")
                : `${data.avgMinutesToDriver} ${t("common.minutesShort")}`
            }
          />
          <MetricCard
            icon={<LifeBuoy size={18} color={colors.red} />}
            label={t("adminPanel.cancelledTotal")}
            value={String(data.cancelledTotal)}
          />
        </View>
      ) : (
        <Card variant="ocean" className="mt-4">
          <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("adminPanel.assistantNote")}
          </Text>
        </Card>
      )}
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="min-w-[120px] flex-1 gap-1 rounded-2xl bg-canvas p-3 dark:bg-night">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="font-body-semi text-[11px] text-ink-soft dark:text-night-muted">
          {label}
        </Text>
      </View>
      <Text className="font-heading text-2xl text-ink dark:text-nzila-sand">{value}</Text>
      {hint ? (
        <Text className="font-body text-[10px] text-nzila-red">{hint}</Text>
      ) : null}
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="min-w-[150px] flex-1 gap-2">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="font-body-semi text-[11px] text-ink-soft dark:text-night-muted">
          {label}
        </Text>
      </View>
      <Text className="font-heading text-xl text-ink dark:text-nzila-sand">{value}</Text>
      {hint ? (
        <Text className="font-body text-[10px] text-ink-soft dark:text-night-muted">
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

function Shortcut({
  icon,
  title,
  body,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[150px] flex-1 gap-2 rounded-2xl border border-line bg-surface p-4 active:opacity-80 dark:border-night-line dark:bg-coal"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-canvas dark:bg-night">
        {icon}
      </View>
      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">{title}</Text>
      <Text className="font-body text-[11px] leading-4 text-ink-soft dark:text-night-muted">
        {body}
      </Text>
    </Pressable>
  );
}
