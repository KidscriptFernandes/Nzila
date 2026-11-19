import { useState } from "react";
import { Share as NativeShare, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, KeyRound, Mail, Share } from "lucide-react-native";
import type { CreateDriverInput } from "@nzila/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, PhoneInput } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAdminCreateDriver } from "@/features/admin/hooks";
import { useMe } from "@/features/auth/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";

export default function NewDriverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const create = useAdminCreateDriver();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("+244");
  const [zones, setZones] = useState("");
  const [references, setReferences] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState("4");
  const [formError, setFormError] = useState<string | null>(null);

  if (me.isPending || !me.data) return <LoadingScreen />;

  if (me.data.profile.role !== "admin") {
    return (
      <Screen>
        <ScreenHeader back title={t("adminDrivers.new")} />
        <ErrorState message={t("admin.adminOnly")} />
      </Screen>
    );
  }

  if (create.data) {
    const credentials = `${t("common.email")}: ${create.data.credentials.email}\n${t("adminDrivers.temporaryPassword")}: ${create.data.credentials.temporaryPassword}`;
    return (
      <Screen scroll contentContainerClassName="px-5 pb-10">
        <ScreenHeader back title={t("adminDrivers.createdTitle")} />
        <Card variant="green" className="gap-3">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={20} color={colors.baobab} />
            <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
              {t("adminDrivers.createdTitle")}
            </Text>
          </View>
          <Text className="font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
            {t("adminDrivers.createdBody", { name: create.data.driver.fullName })}
          </Text>
        </Card>

        <Card className="mt-4 gap-3">
          <Text className="font-body-semi text-xs uppercase tracking-wide text-ink-soft dark:text-night-muted">
            {create.data.driver.code}
          </Text>
          <View className="flex-row items-center gap-2">
            <Mail size={16} color={colors.ocean} />
            <Text selectable className="font-body text-sm text-ink dark:text-nzila-sand">
              {create.data.credentials.email}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <KeyRound size={16} color={colors.gold} />
            <Text selectable className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {create.data.credentials.temporaryPassword}
            </Text>
          </View>
          <Button
            label={t("adminDrivers.shareCredentials")}
            variant="outline"
            leftIcon={<Share size={15} color={colors.text} />}
            onPress={() => void NativeShare.share({ message: credentials })}
          />
          <Text className="font-body text-[11px] leading-4 text-ink-soft dark:text-night-muted">
            {t("adminDrivers.credentialsHint")}
          </Text>
        </Card>

        <Button
          label={t("adminDrivers.backToList")}
          fullWidth
          className="mt-4"
          onPress={() => router.replace("/(admin)/(tabs)/drivers")}
        />
      </Screen>
    );
  }

  const submit = () => {
    if (fullName.trim().length < 2) {
      setFormError(t("adminDrivers.requiredName"));
      return;
    }
    if (!email.includes("@")) {
      setFormError(t("adminDrivers.requiredEmail"));
      return;
    }
    if (whatsapp.trim().length < 8) {
      setFormError(t("adminDrivers.requiredPhone"));
      return;
    }
    if (!make.trim() || !model.trim() || !color.trim() || plate.trim().length < 3) {
      setFormError(t("adminDrivers.requiredVehicle"));
      return;
    }
    const parsedSeats = Number(seats);
    if (!Number.isInteger(parsedSeats) || parsedSeats < 1 || parsedSeats > 8) {
      setFormError(t("adminDrivers.invalidSeats"));
      return;
    }

    const payload: CreateDriverInput = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      zones: zones
        .split(",")
        .map((zone) => zone.trim())
        .filter(Boolean),
      ...(references.trim() ? { references: references.trim() } : {}),
      vehicle: {
        make: make.trim(),
        model: model.trim(),
        color: color.trim(),
        plate: plate.trim().toUpperCase(),
        seats: parsedSeats,
      },
    };

    setFormError(null);
    create.mutate(payload, {
      onError: (error) => notify(t("adminDrivers.createError"), apiErrorMessage(error, t)),
    });
  };

  return (
    <Screen scroll keyboard contentContainerClassName="px-5 pb-10">
      <ScreenHeader
        back
        title={t("adminDrivers.new")}
        subtitle={t("adminDrivers.newSubtitle")}
      />

      <Card className="gap-4">
        <Input
          label={t("adminDrivers.fullName")}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ex.: João Manuel"
          required
        />
        <Input
          label={t("common.email")}
          value={email}
          onChangeText={setEmail}
          placeholder="motorista@exemplo.ao"
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />
        <PhoneInput
          label={t("common.whatsapp")}
          value={whatsapp}
          onChangeText={setWhatsapp}
          required
        />
        <Input
          label={t("driver.zones")}
          value={zones}
          onChangeText={setZones}
          placeholder={t("adminDrivers.zonesPlaceholder")}
          hint={t("adminDrivers.zonesHint")}
        />
        <Input
          label={t("adminDrivers.references")}
          value={references}
          onChangeText={setReferences}
          placeholder={t("adminDrivers.referencesPlaceholder")}
          multiline
          maxLength={1000}
        />
      </Card>

      <Card className="mt-4 gap-4">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("adminDrivers.vehicle")}
        </Text>
        <Input
          label={t("adminDrivers.make")}
          value={make}
          onChangeText={setMake}
          placeholder="Toyota"
          required
        />
        <Input
          label={t("adminDrivers.model")}
          value={model}
          onChangeText={setModel}
          placeholder="Corolla"
          required
        />
        <Input
          label={t("adminDrivers.color")}
          value={color}
          onChangeText={setColor}
          placeholder="Branco"
          required
        />
        <Input
          label={t("adminDrivers.plate")}
          value={plate}
          onChangeText={setPlate}
          placeholder="LD-00-00-AA"
          autoCapitalize="characters"
          required
        />
        <Input
          label={t("adminDrivers.seats")}
          value={seats}
          onChangeText={setSeats}
          keyboardType="number-pad"
          required
        />
      </Card>

      {formError ? (
        <Text className="mt-3 font-body text-xs text-nzila-red">{formError}</Text>
      ) : null}

      <Button
        label={create.isPending ? t("adminDrivers.creating") : t("adminDrivers.create")}
        fullWidth
        size="lg"
        className="mt-4"
        loading={create.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
