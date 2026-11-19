import { useDeferredValue, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Search, Star, Users } from "lucide-react-native";
import {
  DRIVER_VERIFICATION_STATUSES,
  type AdminDriverDTO,
  type DriverVerificationStatus,
} from "@nzila/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useAdminDrivers,
  useAdminUpdateDriverVerification,
} from "@/features/admin/hooks";
import { useMe } from "@/features/auth/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TONE: Record<DriverVerificationStatus, "neutral" | "gold" | "green" | "red"> = {
  PENDENTE: "neutral",
  EM_VERIFICACAO: "gold",
  VERIFICADO: "green",
  REPROVADO: "red",
};

const NEXT_ACTIONS: Record<
  DriverVerificationStatus,
  Array<{ to: DriverVerificationStatus; labelKey: string; primary?: boolean }>
> = {
  PENDENTE: [{ to: "EM_VERIFICACAO", labelKey: "adminDrivers.start", primary: true }],
  EM_VERIFICACAO: [
    { to: "VERIFICADO", labelKey: "adminDrivers.approve", primary: true },
    { to: "REPROVADO", labelKey: "adminDrivers.reject" },
  ],
  VERIFICADO: [{ to: "REPROVADO", labelKey: "adminDrivers.reject" }],
  REPROVADO: [{ to: "EM_VERIFICACAO", labelKey: "adminDrivers.reopen", primary: true }],
};

export default function AdminDriversScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState<DriverVerificationStatus | undefined>();
  const q = useDeferredValue(search.trim());
  const drivers = useAdminDrivers({ verification, q: q || undefined, limit: 200 });
  const items = drivers.data?.items ?? [];
  const isAdmin = me.data?.profile.role === "admin";

  return (
    <Screen>
      <ScreenHeader
        title={t("adminDrivers.title")}
        subtitle={t("adminDrivers.subtitle")}
        right={
          isAdmin ? (
            <Button
              label={t("adminDrivers.new")}
              size="sm"
              leftIcon={<Plus size={15} color="#FFFFFF" />}
              onPress={() => router.push("/(admin)/drivers/new")}
            />
          ) : undefined
        }
      />

      <View className="w-full max-w-5xl self-center px-5 pb-2">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t("adminDrivers.search")}
          left={<Search size={16} color={colors.muted} />}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 shrink-0"
        contentContainerClassName="gap-2 px-5"
      >
        <FilterChip
          label={t("common.all")}
          selected={!verification}
          onPress={() => setVerification(undefined)}
        />
        {DRIVER_VERIFICATION_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={t(`verification.${value}`)}
            selected={verification === value}
            onPress={() => setVerification(value)}
          />
        ))}
      </ScrollView>

      {drivers.isPending ? (
        <View className="w-full max-w-5xl self-center gap-3 px-5 pt-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 w-full" />
          ))}
        </View>
      ) : drivers.isError ? (
        <ErrorState
          message={apiErrorMessage(drivers.error, t)}
          onRetry={() => void drivers.refetch()}
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
            paddingTop: 16,
            paddingBottom: 32,
            gap: 12,
          }}
          refreshing={drivers.isRefetching}
          onRefresh={() => void drivers.refetch()}
          renderItem={({ item }) => <DriverCard driver={item} canManage={isAdmin} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={28} color={colors.ocean} />}
              title={t("adminDrivers.emptyTitle")}
              body={t("adminDrivers.emptyBody")}
            />
          }
        />
      )}
    </Screen>
  );
}

function DriverCard({ driver, canManage }: { driver: AdminDriverDTO; canManage: boolean }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const update = useAdminUpdateDriverVerification(driver.id);
  const vehicle = driver.vehicles[0];

  const change = (verification: DriverVerificationStatus) => {
    update.mutate(
      { verification },
      {
        onSuccess: () => notify(t("adminDrivers.updated")),
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <Avatar name={driver.fullName} size={44} />
        <View className="flex-1">
          <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
            {driver.fullName}
          </Text>
          <Text className="mt-0.5 font-body text-xs text-ink-soft dark:text-night-muted">
            {driver.code}
            {driver.whatsapp ? ` · ${driver.whatsapp}` : ""}
          </Text>
        </View>
        <Badge tone={TONE[driver.verification]} label={t(`verification.${driver.verification}`)} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Badge
          tone="gold"
          icon={<Star size={11} color={colors.gold} fill={colors.gold} />}
          label={`${Number(driver.ratingAvg).toFixed(1)} (${driver.ratingCount})`}
        />
        <Badge tone={driver.available ? "green" : "neutral"} label={
          driver.available ? t("adminDrivers.available") : t("adminDrivers.unavailable")
        } />
        {vehicle ? (
          <Badge tone="dark" label={`${vehicle.make} ${vehicle.model} · ${vehicle.plate}`} />
        ) : (
          <Badge tone="neutral" label={t("driver.noVehicles")} />
        )}
      </View>

      {driver.zones.length ? (
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("driver.zones")}: {driver.zones.join(" · ")}
        </Text>
      ) : null}

      {canManage ? (
        <View className="flex-row flex-wrap gap-2 border-t border-line pt-3 dark:border-night-line">
          {NEXT_ACTIONS[driver.verification].map((action) => (
            <Button
              key={action.to}
              label={t(action.labelKey)}
              size="sm"
              variant={action.primary ? "primary" : "outline"}
              className={!action.primary ? "border-nzila-red" : undefined}
              textClassName={!action.primary ? "text-nzila-red" : undefined}
              loading={update.isPending}
              onPress={() => change(action.to)}
            />
          ))}
        </View>
      ) : null}
    </Card>
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
