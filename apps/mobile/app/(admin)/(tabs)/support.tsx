import { useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LifeBuoy, MessageCircle, Phone } from "lucide-react-native";
import {
  SUPPORT_STATUSES,
  type SupportRequestDTO,
  type SupportStatus,
} from "@nzila/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminSupport, useAdminUpdateSupport } from "@/features/admin/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<SupportStatus, "gold" | "ocean" | "green"> = {
  ABERTO: "gold",
  EM_ATENDIMENTO: "ocean",
  RESOLVIDO: "green",
};

export default function AdminSupportScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [status, setStatus] = useState<SupportStatus | undefined>(undefined);
  const support = useAdminSupport({ status, limit: 200 });
  const items = support.data?.items ?? [];

  return (
    <Screen>
      <ScreenHeader title={t("adminSupport.title")} subtitle={t("adminSupport.subtitle")} />

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
        {SUPPORT_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={t(`supportStatus.${value}`)}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </ScrollView>

      {support.isPending ? (
        <View className="w-full max-w-5xl self-center gap-3 px-5 pt-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 w-full" />
          ))}
        </View>
      ) : support.isError ? (
        <ErrorState
          message={apiErrorMessage(support.error, t)}
          onRetry={() => void support.refetch()}
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
          refreshing={support.isRefetching}
          onRefresh={() => void support.refetch()}
          renderItem={({ item }) => <SupportCard request={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={<LifeBuoy size={28} color={colors.gold} />}
              title={t("adminSupport.emptyTitle")}
              body={t("adminSupport.emptyBody")}
            />
          }
        />
      )}
    </Screen>
  );
}

function SupportCard({ request }: { request: SupportRequestDTO }) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const update = useAdminUpdateSupport(request.id);

  const changeStatus = (next: "EM_ATENDIMENTO" | "RESOLVIDO") => {
    update.mutate(
      { status: next },
      {
        onSuccess: () => notify(t("adminSupport.updated")),
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Card className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge
          tone={request.priority === "URGENTE" ? "red" : request.priority === "PRIORIDADE" ? "gold" : "neutral"}
          label={t(`priority.${request.priority}`)}
        />
        <Badge
          tone={STATUS_TONE[request.status]}
          label={t(`supportStatus.${request.status}`)}
        />
        {request.rideReference ? (
          <Badge tone="ocean" label={request.rideReference} />
        ) : null}
        <Text className="ml-auto font-body text-[11px] text-ink-soft dark:text-night-muted">
          {formatDateTime(request.createdAt, i18n.language)}
        </Text>
      </View>

      <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
        {request.riderName ?? t("adminSupport.rider")}
        {request.riderPhone ? ` · ${request.riderPhone}` : ""}
      </Text>
      <Text className="font-body text-sm leading-5 text-ink dark:text-nzila-sand">
        {request.message}
      </Text>

      {request.riderPhone ? (
        <View className="flex-row flex-wrap gap-2">
          <Button
            label={t("common.call")}
            variant="outline"
            size="sm"
            leftIcon={<Phone size={14} color={colors.text} />}
            onPress={() => void Linking.openURL(`tel:${request.riderPhone}`)}
          />
          <Button
            label="WhatsApp"
            variant="outline"
            size="sm"
            leftIcon={<MessageCircle size={14} color={colors.ocean} />}
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/${request.riderPhone?.replace(/[^\d]/g, "") ?? ""}?text=${encodeURIComponent(t("adminSupport.whatsappMessage"))}`,
              )
            }
          />
        </View>
      ) : null}

      {request.status !== "RESOLVIDO" ? (
        <View className="flex-row flex-wrap gap-2">
          {request.status === "ABERTO" ? (
            <Button
              label={t("adminSupport.start")}
              size="sm"
              loading={update.isPending}
              onPress={() => changeStatus("EM_ATENDIMENTO")}
            />
          ) : null}
          <Button
            label={t("adminSupport.resolve")}
            variant="outline"
            size="sm"
            loading={update.isPending}
            onPress={() => changeStatus("RESOLVIDO")}
          />
        </View>
      ) : (
        <Text className="font-body text-[11px] text-nzila-baobab">
          {request.resolvedAt
            ? t("adminSupport.resolvedAt", {
                date: formatDateTime(request.resolvedAt, i18n.language),
              })
            : t("adminSupport.resolved")}
        </Text>
      )}
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
