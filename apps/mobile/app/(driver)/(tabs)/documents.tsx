import { useState } from "react";
import { Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { FileText, Upload } from "lucide-react-native";
import {
  DRIVER_DOCUMENT_TYPES,
  type DriverDocumentType,
} from "@nzila/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useDriverDocuments, useUploadDriverDocument } from "@/features/drivers/hooks";
import { useMe } from "@/features/auth/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDateShort } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type PickedFile = { name: string; uri: string; mime: string; size: number };

function inferMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function DriverDocumentsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const me = useMe();
  const documents = useDriverDocuments();
  const upload = useUploadDriverDocument();
  const [type, setType] = useState<DriverDocumentType>("IDENTIFICACAO");
  const [file, setFile] = useState<PickedFile | null>(null);

  if (me.isPending) return <LoadingScreen />;

  const verification = me.data?.driver?.verification;

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIMES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const mime = asset.mimeType ?? inferMime(asset.name);
    if (!ALLOWED_MIMES.includes(mime)) {
      notify(t("common.error"), t("driver.documentHint"));
      return;
    }
    if (!asset.size || asset.size > MAX_BYTES) {
      notify(t("common.error"), t("driver.documentHint"));
      return;
    }
    setFile({ name: asset.name, uri: asset.uri, mime, size: asset.size });
  };

  const submit = () => {
    if (!file) {
      notify(t("common.error"), t("driver.selectFile"));
      return;
    }
    upload.mutate(
      {
        type,
        filename: file.name,
        contentType: file.mime,
        sizeBytes: file.size,
        uri: file.uri,
      },
      {
        onSuccess: () => {
          notify(t("driver.uploadSuccess"));
          setFile(null);
        },
        onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
      },
    );
  };

  return (
    <Screen
      scroll
      refreshing={documents.isRefetching}
      onRefresh={() => void documents.refetch()}
      contentContainerClassName="w-full max-w-3xl self-center px-5 pb-10"
    >
      <ScreenHeader
        title={t("driver.documentsTitle")}
        subtitle={t("driver.documentsSubtitle")}
      />

      <Card className="mb-4 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-body-semi text-xs uppercase tracking-wide text-ink-soft dark:text-night-muted">
            {t("driver.verification")}
          </Text>
          <Text className="mt-1 font-heading-semi text-base text-ink dark:text-nzila-sand">
            {verification ? t(`verification.${verification}`) : t("common.unknown")}
          </Text>
        </View>
        {verification ? (
          <Badge
            tone={
              verification === "VERIFICADO"
                ? "green"
                : verification === "REPROVADO"
                  ? "red"
                  : verification === "EM_VERIFICACAO"
                    ? "gold"
                    : "neutral"
            }
            label={t(`verification.${verification}`)}
          />
        ) : null}
      </Card>

      <Card className="gap-3">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("driver.docType")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {DRIVER_DOCUMENT_TYPES.map((value) => (
            <Button
              key={value}
              label={t(`documentType.${value}`)}
              size="sm"
              variant={type === value ? "secondary" : "outline"}
              onPress={() => setType(value)}
            />
          ))}
        </View>

        <Button
          label={file ? file.name : t("driver.selectFile")}
          variant="outline"
          leftIcon={<FileText size={15} color={colors.text} />}
          onPress={() => void chooseFile()}
        />
        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("driver.documentHint")}
        </Text>

        <Button
          label={upload.isPending ? t("driver.uploading") : t("driver.upload")}
          fullWidth
          loading={upload.isPending}
          disabled={!file}
          leftIcon={<Upload size={16} color="#FFFFFF" />}
          onPress={submit}
        />
      </Card>

      <View className="mb-2 mt-6 flex-row items-center justify-between">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("driver.documentsTitle")}
        </Text>
        {documents.data ? (
          <Badge tone="neutral" label={String(documents.data.items.length)} />
        ) : null}
      </View>

      {documents.isPending ? (
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
          {t("common.loading")}
        </Text>
      ) : documents.isError ? (
        <ErrorState
          message={apiErrorMessage(documents.error, t)}
          onRetry={() => void documents.refetch()}
        />
      ) : documents.data?.items.length ? (
        <View className="gap-2">
          {documents.data.items.map((document) => (
            <Card key={document.id} className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-canvas dark:bg-night">
                <FileText size={18} color={colors.ocean} />
              </View>
              <View className="flex-1">
                <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                  {t(`documentType.${document.type}`)}
                </Text>
                <Text className="mt-0.5 font-body text-[11px] text-ink-soft dark:text-night-muted">
                  {formatDateShort(document.createdAt, i18n.language)}
                  {document.expiresAt
                    ? ` · ${t("driver.expires")}: ${formatDateShort(document.expiresAt, i18n.language)}`
                    : ""}
                </Text>
              </View>
              <Badge tone="green" label={t("adminDrivers.received")} />
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
            {t("driver.noDocuments")}
          </Text>
        </Card>
      )}
    </Screen>
  );
}
