import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailSchema, phoneSchema } from "@nzila/shared";
import { Eye, EyeOff } from "lucide-react-native";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormInput } from "@/components/ui/FormInput";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { GoogleAuthButton } from "@/features/auth/GoogleAuthButton";
import { apiErrorMessage } from "@/lib/errors";
import { queryClient } from "@/lib/query";
import { useSession } from "@/store/session";
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
  const registerAccount = useSession((state) => state.register);
  const language = useSettings((state) => state.language);
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

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
    try {
      await registerAccount({
        fullName: values.fullName.trim(),
        email: values.email,
        password: values.password,
        whatsapp: values.whatsapp.trim(),
        locale: language,
        nationality: values.nationality?.trim() || undefined,
        arrivalDate: values.arrivalDate?.trim() || undefined,
        hotel: values.hotel?.trim() || undefined,
        consent: true,
      });
      queryClient.clear();
      router.replace("/");
    } catch (error) {
      setRootError(apiErrorMessage(error, t));
    }
  };

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
            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
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

        <GoogleAuthButton disabled={isSubmitting} onError={setRootError} />
      </Card>

      <Pressable onPress={() => router.replace("/(auth)/login")} className="mt-6 items-center">
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
          {t("auth.haveAccount")}
        </Text>
      </Pressable>
    </Screen>
  );
}
