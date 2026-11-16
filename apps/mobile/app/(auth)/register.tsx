import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailSchema, phoneSchema } from "@nzila/shared";
import { Eye, EyeOff, MailCheck } from "lucide-react-native";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormInput } from "@/components/ui/FormInput";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { supabaseConfigured } from "@/lib/env";
import { queryClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/store/settings";

const registerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Indica o teu nome"),
  email: emailSchema,
  password: z.string().min(8, "Mínimo 8 caracteres"),
  whatsapp: phoneSchema,
  nationality: z.string().trim().max(80).optional(),
  arrivalDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data no formato AAAA-MM-DD")
    .optional(),
  hotel: z.string().trim().max(160).optional(),
  consent: z.boolean().refine((value) => value, {
    message: "É necessário aceitar a política de privacidade",
  }),
});

type RegisterValues = z.infer<typeof registerFormSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettings((state) => state.language);
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      whatsapp: "+244",
      nationality: "",
      arrivalDate: "",
      hotel: "",
      consent: false,
    },
  });

  const consent = watch("consent");

  const onSubmit = async (values: RegisterValues) => {
    setRootError(null);
    if (!supabaseConfigured) {
      setRootError(t("auth.notConfigured"));
      return;
    }

    const metadata: Record<string, string | boolean> = {
      full_name: values.fullName.trim(),
      whatsapp: values.whatsapp.trim(),
      locale: language,
      consent: true,
    };
    if (values.nationality?.trim()) metadata.nationality = values.nationality.trim();
    if (values.arrivalDate?.trim()) metadata.arrival_date = values.arrivalDate.trim();
    if (values.hotel?.trim()) metadata.hotel = values.hotel.trim();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: metadata },
    });

    if (error) {
      const message = error.message.toLowerCase();
      setRootError(
        message.includes("already registered")
          ? t("auth.alreadyRegistered")
          : error.message,
      );
      return;
    }

    if (data.session) {
      queryClient.clear();
      router.replace("/");
      return;
    }

    setSentEmail(values.email);
  };

  if (sentEmail) {
    return (
      <Screen className="justify-center px-6">
        <Card className="items-center py-8">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nzila-baobab-soft dark:bg-nzila-baobab/20">
            <MailCheck size={28} color="#2E7D4F" />
          </View>
          <Text className="text-center font-heading text-xl text-ink dark:text-nzila-sand">
            {t("auth.checkEmail")}
          </Text>
          <Text className="mt-2 text-center font-body text-sm text-ink-soft dark:text-night-muted">
            {sentEmail}
          </Text>
          <Button
            label={t("auth.signIn")}
            className="mt-6"
            onPress={() => router.replace("/(auth)/login")}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard contentContainerClassName="px-6 pb-10">
      <ScreenHeader back />
      <View className="items-center pt-1">
        <Wordmark />
      </View>

      <View className="mt-8">
        <Text className="font-heading text-[30px] leading-9 tracking-tight text-ink dark:text-nzila-sand">
          {t("auth.registerTitle")}
        </Text>
        <Text className="mt-2 font-body text-base leading-6 text-ink-soft dark:text-night-muted">
          {t("auth.registerSubtitle")}
        </Text>
      </View>

      <Card className="mt-6 gap-4 p-5">
        <FormInput
          control={control}
          name="fullName"
          label={t("auth.fullName")}
          placeholder="Ana Silva"
          autoCapitalize="words"
          autoComplete="name"
        />
        <FormInput
          control={control}
          name="email"
          label={t("auth.email")}
          placeholder="nome@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormInput
          control={control}
          name="password"
          label={t("auth.password")}
          hint={t("auth.passwordHint")}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          right={
            <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
              {showPassword ? (
                <EyeOff size={19} color="#4A4A4A" />
              ) : (
                <Eye size={19} color="#4A4A4A" />
              )}
            </Pressable>
          }
        />
        <FormInput
          control={control}
          name="whatsapp"
          label={t("auth.whatsapp")}
          placeholder="+244923000000"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <FormInput
          control={control}
          name="nationality"
          label={`${t("auth.nationality")} (${t("common.optional")})`}
          placeholder="Portugal"
          autoCapitalize="words"
        />
        <FormInput
          control={control}
          name="arrivalDate"
          label={`${t("auth.arrivalDate")} (${t("common.optional")})`}
          placeholder="AAAA-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <FormInput
          control={control}
          name="hotel"
          label={`${t("auth.hotel")} (${t("common.optional")})`}
          placeholder={t("auth.hotelPlaceholder")}
        />

        <Checkbox
          checked={consent}
          onChange={(value) => setValue("consent", value, { shouldValidate: true })}
          label={t("auth.consent")}
          error={errors.consent?.message}
        />

        {rootError ? (
          <Text className="font-body text-sm leading-5 text-nzila-red">{rootError}</Text>
        ) : null}

        <Button
          label={isSubmitting ? t("auth.creating") : t("auth.createAccount")}
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </Card>

      <Pressable onPress={() => router.replace("/(auth)/login")} className="mt-6 items-center">
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
          {t("auth.haveAccount")}
        </Text>
      </Pressable>
    </Screen>
  );
}
