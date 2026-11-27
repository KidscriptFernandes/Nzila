import { useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import {
  BadgeCheck,
  Download,
  LogOut,
  MessageCircle,
  ShieldAlert,
  Trash2,
} from "lucide-react-native";
import type { MeResponse, UpdateProfileInput } from "@nzila/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input, PhoneInput } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { VerifiedSeal } from "@/components/ui/VerifiedSeal";
import {
  useMe,
  useRequestAccountDeletion,
  useUpdateMe,
} from "@/features/auth/hooks";
import { confirmAction, notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { formatDate, wallDateParts, whatsappUrl, type AppLocale } from "@/lib/format";
import { registerForPushNotifications } from "@/lib/notifications";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";
import { useSettings, type ThemeMode } from "@/store/settings";

const LANGUAGES: Array<{ value: AppLocale; label: string }> = [
  { value: "pt-AO", label: "Português" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const THEMES: Array<{ value: ThemeMode; key: string }> = [
  { value: "light", key: "profile.light" },
  { value: "dark", key: "profile.dark" },
  { value: "system", key: "profile.system" },
];

export default function ClientProfileScreen() {
  const me = useMe();
  if (me.isPending || !me.data) return <LoadingScreen />;
  return <ProfileContent me={me.data} />;
}

function ProfileContent({ me }: { me: MeResponse }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const email = useSession((state) => state.session?.user.email);
  const signOut = useSession((state) => state.signOut);

  const updateMe = useUpdateMe();
  const deleteAccount = useRequestAccountDeletion();

  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);
  const pushEnabled = useSettings((state) => state.pushEnabled);
  const setPushEnabled = useSettings((state) => state.setPushEnabled);

  const [fullName, setFullName] = useState(me.profile.fullName);
  const [whatsapp, setWhatsapp] = useState(me.profile.whatsapp || "+244");
  const [nationality, setNationality] = useState(me.client?.nationality ?? "");
  const [hotel, setHotel] = useState(me.client?.hotel ?? "");
  const [arrivalDate, setArrivalDate] = useState<Date | null>(() =>
    me.client?.arrivalDate ? new Date(`${me.client.arrivalDate}T12:00:00`) : null,
  );
  const [formError, setFormError] = useState<string | undefined>();

  const version = Constants.expoConfig?.version ?? "1.0.0";

  const save = () => {
    if (fullName.trim().length < 2) {
      setFormError(t("rideForm.errName"));
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(whatsapp.trim())) {
      setFormError(t("rideForm.errPhone"));
      return;
    }
    setFormError(undefined);

    const payload: UpdateProfileInput = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      nationality: nationality.trim() || null,
      hotel: hotel.trim() || null,
      arrivalDate: arrivalDate ? wallDateParts(arrivalDate).date : null,
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

  const togglePush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    if (!enabled) return;
    try {
      const token = await registerForPushNotifications();
      if (!token) {
        setPushEnabled(false);
        notify(t("profile.notificationsDisabled"));
      }
    } catch (error) {
      setPushEnabled(false);
      notify(t("common.error"), apiErrorMessage(error, t));
    }
  };

  const confirmSignOut = () => {
    confirmAction({
      title: t("common.signOut"),
      message: t("profile.signOutConfirm"),
      confirmLabel: t("common.signOut"),
      cancelLabel: t("common.back"),
      destructive: true,
      onConfirm: () => void signOut().then(() => router.replace("/(auth)/login")),
    });
  };

  const confirmDelete = () => {
    confirmAction({
      title: t("profile.delete"),
      message: t("profile.deleteConfirm"),
      confirmLabel: t("profile.delete"),
      cancelLabel: t("common.back"),
      destructive: true,
      onConfirm: () =>
        deleteAccount.mutate(undefined, {
          onSuccess: () => {
            notify(t("profile.deleteSuccess"));
            void signOut().then(() => router.replace("/(auth)/login"));
          },
          onError: (error) => notify(t("common.error"), apiErrorMessage(error, t)),
        }),
    });
  };

  return (
    <Screen scroll contentContainerClassName="pb-10">
      <ScreenHeader title={t("profile.title")} />

      <View className="px-5">
        <Card className="items-center gap-2 py-6">
          <Avatar name={me.profile.fullName} size={72} />
          <View className="flex-row items-center gap-2">
            <Text className="font-heading text-xl text-ink dark:text-nzila-sand">
              {me.profile.fullName}
            </Text>
            {me.driver?.verification === "VERIFICADO" ? <VerifiedSeal compact /> : null}
          </View>
          <Text className="font-body text-sm text-ink-soft dark:text-night-muted">{email}</Text>
          <Badge
            tone="dark"
            label={
              me.profile.role === "driver" ? t("profile.driverAccount") : t("profile.clientAccount")
            }
          />
          <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
            {t("profile.memberSince", { date: formatDate(me.profile.createdAt) })}
          </Text>
        </Card>

        {me.driver ? (
          <Card className="mt-4 gap-3">
            <View className="flex-row items-center gap-2">
              <BadgeCheck size={18} color={colors.baobab} />
              <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                {t("profile.driverCode")}: {me.driver.code}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Badge
                tone={me.driver.verification === "VERIFICADO" ? "green" : "gold"}
                label={t(`verification.${me.driver.verification}`)}
              />
              <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                {t("driver.rating")} {Number(me.driver.ratingAvg).toFixed(1)} ·{" "}
                {t("driver.ratingsCount", { count: me.driver.ratingCount })}
              </Text>
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
            autoCapitalize="words"
          />
          <PhoneInput label={t("auth.whatsapp")} value={whatsapp} onChangeText={setWhatsapp} />
          <Input
            label={t("auth.nationality")}
            value={nationality}
            onChangeText={setNationality}
            placeholder={t("auth.nationality")}
          />
          <Input
            label={t("auth.hotel")}
            value={hotel}
            onChangeText={setHotel}
            placeholder={t("auth.hotelPlaceholder")}
          />
          {arrivalDate ? (
            <View className="gap-2">
              <DatePickerField
                label={t("auth.arrivalDate")}
                value={arrivalDate}
                mode="date"
                onChange={setArrivalDate}
              />
              <Pressable
                onPress={() => setArrivalDate(null)}
                className="flex-row items-center gap-1.5 self-start py-1"
              >
                <Trash2 size={13} color={colors.muted} />
                <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
                  {t("profile.removeArrival")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Button
              label={t("profile.addArrival")}
              variant="outline"
              size="sm"
              className="self-start"
              onPress={() => setArrivalDate(new Date())}
            />
          )}
          {formError ? (
            <Text className="font-body text-xs text-nzila-red">{formError}</Text>
          ) : null}
          <Button
            label={updateMe.isPending ? t("common.saving") : t("common.save")}
            fullWidth
            loading={updateMe.isPending}
            onPress={save}
          />
        </Card>

        <Card className="mt-4 gap-4">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("profile.preferences")}
          </Text>

          <View className="gap-2">
            <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
              {t("profile.language")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {LANGUAGES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => changeLanguage(item.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-2",
                    language === item.value
                      ? "border-nzila-red bg-nzila-red"
                      : "border-line bg-surface dark:border-night-line dark:bg-coal",
                  )}
                >
                  <Text
                    className={cn(
                      "font-body-semi text-xs",
                      language === item.value ? "text-white" : "text-ink-soft dark:text-night-muted",
                    )}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
              {t("profile.theme")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {THEMES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setTheme(item.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-2",
                    theme === item.value
                      ? "border-nzila-ocean bg-nzila-ocean-soft dark:bg-nzila-ocean/20"
                      : "border-line bg-surface dark:border-night-line dark:bg-coal",
                  )}
                >
                  <Text
                    className={cn(
                      "font-body-semi text-xs",
                      theme === item.value
                        ? "text-nzila-ocean dark:text-[#7FD0DA]"
                        : "text-ink-soft dark:text-night-muted",
                    )}
                  >
                    {t(item.key)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between gap-3 border-t border-line pt-3 dark:border-night-line">
            <View className="flex-1">
              <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
                {t("profile.notifications")}
              </Text>
              <Text className="mt-0.5 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
                {t("profile.notificationsBody")}
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(value) => void togglePush(value)}
              trackColor={{ false: colors.line, true: colors.red }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card className="mt-4 gap-3">
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("profile.data")}
          </Text>
          <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("profile.exportBody")}
          </Text>
          <Button
            label={t("profile.exportRequest")}
            variant="outline"
            leftIcon={<Download size={15} color={colors.text} />}
            onPress={() =>
              void Linking.openURL(
                whatsappUrl(t("profile.exportMessage", { email: email ?? "" })),
              )
            }
          />
          <Button
            label={t("rideDetail.support")}
            variant="ghost"
            leftIcon={<MessageCircle size={15} color={colors.ocean} />}
            onPress={() => router.push("/(client)/help")}
          />
        </Card>

        <Card variant="red" className="mt-4 gap-3">
          <View className="flex-row items-center gap-2">
            <ShieldAlert size={17} color={colors.red} />
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("profile.dangerZone")}
            </Text>
          </View>
          <Text className="font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
            {t("profile.deleteBody")}
          </Text>
          <Button
            label={t("profile.delete")}
            variant="outline"
            className="border-nzila-red"
            textClassName="text-nzila-red"
            loading={deleteAccount.isPending}
            leftIcon={<Trash2 size={15} color={colors.red} />}
            onPress={confirmDelete}
          />
        </Card>

        <Button
          label={t("common.signOut")}
          variant="outline"
          fullWidth
          className="mt-4"
          leftIcon={<LogOut size={16} color={colors.text} />}
          onPress={confirmSignOut}
        />

        <Text className="mt-6 text-center font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("profile.version", { version })}
        </Text>
      </View>
    </Screen>
  );
}
