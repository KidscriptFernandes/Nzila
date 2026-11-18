import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import type { RidePriority, SupportRequestDTO } from "@nzila/shared";
import {
  AlertTriangle,
  LifeBuoy,
  MessageCircle,
  PhoneCall,
  Send,
} from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { PriorityChip } from "@/components/ui/PriorityChip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCreateSupportRequest, useMySupportRequests } from "@/features/support/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateTime, whatsappUrl } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

const STATUS_TONE: Record<SupportRequestDTO["status"], "gold" | "ocean" | "green"> = {
  ABERTO: "gold",
  EM_ATENDIMENTO: "ocean",
  RESOLVIDO: "green",
};

export default function ClientHelpScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ rideId?: string; reference?: string }>();
  const rideId = asString(params.rideId);
  const reference = asString(params.reference);

  const requests = useMySupportRequests();
  const create = useCreateSupportRequest();

  const [priority, setPriority] = useState<RidePriority>("NORMAL");
  const [message, setMessage] = useState(() =>
    reference ? t("help.rideMessage", { reference }) : "",
  );
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setError(t("help.minLength"));
      return;
    }
    setError(undefined);

    create.mutate(
      {
        message: trimmed,
        priority,
        ...(rideId ? { rideId } : {}),
      },
      {
        onSuccess: () => {
          setMessage(reference ? t("help.rideMessage", { reference }) : "");
          setPriority("NORMAL");
          notify(t("help.requestSent"));
        },
        onError: (mutationError) =>
          notify(t("common.error"), apiErrorMessage(mutationError, t)),
      },
    );
  };

  return (
    <Screen
      scroll
      refreshing={requests.isRefetching}
      onRefresh={() => void requests.refetch()}
      contentContainerClassName="pb-10"
    >
      <ScreenHeader back title={t("help.title")} subtitle={t("help.subtitle")} />

      <View className="px-5">
        <Card variant="red" className="flex-row items-start gap-3">
          <AlertTriangle size={20} color={colors.red} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("help.emergency")}
            </Text>
            <Text className="mt-1 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {t("help.emergencyNote")}
            </Text>
            <Button
              label={`${t("help.call")} ${t("help.emergencyNumber")}`}
              variant="outline"
              size="sm"
              className="mt-3 self-start border-nzila-red"
              textClassName="text-nzila-red"
              leftIcon={<PhoneCall size={15} color={colors.red} />}
              onPress={() => void Linking.openURL("tel:112")}
            />
          </View>
        </Card>

        <Card className="mt-4 gap-3">
          <View className="flex-row items-center gap-2">
            <LifeBuoy size={18} color={colors.ocean} />
            <Text className="flex-1 font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("home.support")}
            </Text>
          </View>
          <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("help.supportHours")}
          </Text>
          <Button
            label={t("help.whatsapp")}
            variant="outline"
            leftIcon={<MessageCircle size={16} color={colors.ocean} />}
            onPress={() =>
              void Linking.openURL(
                whatsappUrl(reference ? t("help.rideMessage", { reference }) : undefined),
              )
            }
          />
        </Card>

        {rideId ? (
          <Card variant="gold" className="mt-4">
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("help.rideContext")}
            </Text>
            {reference ? (
              <Text className="mt-1 font-body text-xs text-ink-soft dark:text-night-muted">
                {t("help.rideRelated", { reference })}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card className="mt-4 gap-3">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("help.formTitle")}
          </Text>
          <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
            {t("help.priority")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(["NORMAL", "PRIORIDADE", "URGENTE"] as const).map((value) => (
              <PriorityChip
                key={value}
                priority={value}
                selected={priority === value}
                onPress={() => setPriority(value)}
              />
            ))}
          </View>
          {priority === "URGENTE" ? (
            <Text className="font-body text-xs text-nzila-red">{t("help.urgentNote")}</Text>
          ) : null}
          <Input
            label={t("help.message")}
            value={message}
            onChangeText={setMessage}
            placeholder={t("help.messagePlaceholder")}
            error={error}
            multiline
            maxLength={2000}
          />
          <Button
            label={create.isPending ? t("help.sending") : t("help.send")}
            fullWidth
            loading={create.isPending}
            leftIcon={<Send size={16} color="#FFFFFF" />}
            onPress={submit}
          />
        </Card>

        <Text className="mb-2 mt-6 font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("help.myRequests")}
        </Text>

        {requests.isPending ? (
          <View className="gap-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </View>
        ) : requests.isError ? (
          <ErrorState
            message={apiErrorMessage(requests.error, t)}
            onRetry={() => void requests.refetch()}
          />
        ) : (requests.data?.items.length ?? 0) === 0 ? (
          <Card className="items-center py-8">
            <LifeBuoy size={28} color={colors.muted} />
            <Text className="mt-3 font-body text-sm text-ink-soft dark:text-night-muted">
              {t("help.noRequests")}
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {requests.data?.items.map((request) => (
              <Card key={request.id} className="gap-2">
                <View className="flex-row items-center justify-between gap-2">
                  <Badge
                    tone={request.priority === "URGENTE" ? "red" : "neutral"}
                    label={t(`priority.${request.priority}`)}
                  />
                  <Badge
                    tone={STATUS_TONE[request.status]}
                    label={t(`supportStatus.${request.status}`)}
                  />
                </View>
                <Text className="font-body text-sm leading-5 text-ink dark:text-nzila-sand">
                  {request.message}
                </Text>
                <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
                  {formatDateTime(request.createdAt, i18n.language)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
