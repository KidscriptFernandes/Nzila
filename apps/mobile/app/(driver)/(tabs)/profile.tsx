import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CarFront,
  LogOut,
  MessageCircle,
  Star,
} from "lucide-react-native";
import type { MeResponse, UpdateProfileInput } from "@nzila/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, PhoneInput } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useMe, useUpdateMe } from "@/features/auth/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate, whatsappUrl, type AppLocale } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";

const LANGUAGES: Array<{ value: AppLocale; label: string }> = [
  { value: "pt-AO", label: "Português" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

export default function DriverProfileScreen() {
  const me = useMe();
  if (me.isPending || !me.data) return <LoadingScreen />;
  return <DriverProfileContent me={me.data} />;
}

function DriverProfileContent({ me }: { me: MeResponse }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const email = useSession((state) => state.session?.user.email);
  const signOut = useSession((state) => state.signOut);
  const updateMe = useUpdateMe();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);

  const driver = me.driver;
  const [fullName, setFullName] = useState(me.profile.fullName);
  const [whatsapp, setWhatsapp] = useState(me.profile.whatsapp);

  const save = () => {
    if (fullName.trim().length < 2) {
      notify(t("common.error"), t("rideForm.errName"));
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(whatsapp.trim())) {
      notify(t("common.error"), t("rideForm.errPhone"));
      return;
    }
    const payload: UpdateProfileInput = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
    };
    updateMe.mutate(payload, {
      onSuccess: () => notify(t("profile.saved")),
      onError: (error) => notify(t("profile.saveError"), apiErrorMessage(error, t)),
    });
  };

  const changeLanguage = (next: AppLocale) => {
    if (next === language) return;
    const previous = language;
    setLanguage(next);
    updateMe.mutate(
      { locale: next },
      {
        onError: (error) => {
          setLanguage(previous);
          notify(t("common.error"), apiErrorMessage(error, t));
        },
      },
    );
  };

  return (
    <Screen
      scroll
      keyboard
      contentContainerClassName="w-full max-w-3xl self-center px-5 pb-10"
    >
      <ScreenHeader title={t("driver.profileTitle")} />

      <Card className="items-center gap-2 py-6">
        <Avatar name={me.profile.fullName} size={72} />
        <Text className="font-heading text-xl text-ink dark:text-nzila-sand">
          {me.profile.fullName}
        </Text>
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">{email}</Text>
        <View className="flex-row flex-wrap items-center justify-center gap-2">
          <Badge tone="dark" label={t("profile.driverAccount")} />
          {driver ? (
            <Badge
              tone={
                driver.verification === "VERIFICADO"
                  ? "green"
                  : driver.verification === "REPROVADO"
                    ? "red"
                    : "gold"
              }
              label={t(`verification.${driver.verification}`)}
            />
          ) : null}
          {driver?.available ? (
            <Badge tone="green" label={t("adminDrivers.available")} />
          ) : null}
        </View>
        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("profile.memberSince", { date: formatDate(me.profile.createdAt) })}
        </Text>
      </Card>

      {driver ? (
        <Card className="mt-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <BadgeCheck size={17} color={colors.baobab} />
              <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                {t("profile.driverCode")}: {driver.code}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Star size={13} color={colors.gold} fill={colors.gold} />
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {Number(driver.ratingAvg).toFixed(1)} ·{" "}
                {t("driver.ratingsCount", { count: driver.ratingCount })}
              </Text>
            </View>
          </View>

          {driver.zones.length ? (
            <View className="gap-1">
              <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
                {t("driver.zones")}
              </Text>
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {driver.zones.join(" · ")}
              </Text>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
              {t("driver.vehicles")}
            </Text>
            {driver.vehicles.length ? (
              driver.vehicles.map((vehicle) => (
                <View
                  key={vehicle.id}
                  className="flex-row items-center gap-3 rounded-2xl bg-canvas p-3 dark:bg-night"
                >
                  <CarFront size={18} color={colors.ocean} />
                  <View className="flex-1">
                    <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                      {vehicle.make} {vehicle.model}
                    </Text>
                    <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
                      {vehicle.color} · {vehicle.seats}{" "}
                      {t("rideForm.passengers").toLowerCase()}
                    </Text>
                  </View>
                  <Badge tone="dark" label={vehicle.plate} />
                </View>
              ))
            ) : (
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {t("driver.noVehicles")}
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      <Card className="mt-4 gap-3">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("profile.personalData")}
        </Text>
        <Input
          label={t("auth.fullName")}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
        <PhoneInput label={t("common.whatsapp")} value={whatsapp} onChangeText={setWhatsapp} />
        <Button
          label={t("common.save")}
          fullWidth
          loading={updateMe.isPending}
          onPress={save}
        />
      </Card>

      <Card className="mt-4 gap-3">
        <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("profile.preferences")}
        </Text>
        <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
          {t("profile.language")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {LANGUAGES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => changeLanguage(item.value)}
              className={cn(
                "rounded-full border px-4 py-2",
                language === item.value
                  ? "border-nzila-red bg-nzila-red"
                  : "border-line bg-surface dark:border-night-line dark:bg-coal",
              )}
            >
              <Text
                className={cn(
                  "font-body-semi text-xs",
                  language === item.value ? "text-white" : "text-ink dark:text-nzila-sand",
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card className="mt-4 gap-3">
        <Button
          label={t("help.whatsapp")}
          variant="outline"
          leftIcon={<MessageCircle size={16} color={colors.ocean} />}
          onPress={() => void Linking.openURL(whatsappUrl(t("driver.supportMessage")))}
        />
        <Button
          label={t("driver.cycle")}
          variant="ghost"
          onPress={() => router.push("/(driver)/(tabs)/documents")}
        />
        <Button
          label={t("common.signOut")}
          variant="ghost"
          leftIcon={<LogOut size={16} color={colors.red} />}
          textClassName="text-nzila-red"
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
        />
      </Card>
    </Screen>
  );
}
