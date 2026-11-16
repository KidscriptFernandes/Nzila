import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema } from "@nzila/shared";
import type { z } from "zod";
import { Eye, EyeOff, Mail } from "lucide-react-native";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { supabaseConfigured } from "@/lib/env";
import { queryClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";

type LoginValues = z.infer<typeof loginSchema>;

function authErrorMessage(error: { message: string; code?: string }, t: (key: string) => string) {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login")) return t("auth.invalidCredentials");
  if (message.includes("email not confirmed")) return t("auth.emailNotConfirmed");
  if (message.includes("invalid") && message.includes("token")) return t("auth.otpInvalid");
  return error.message;
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const finish = () => {
    queryClient.clear();
    router.replace("/");
  };

  const onSubmit = async (values: LoginValues) => {
    setRootError(null);
    if (!supabaseConfigured) {
      setRootError(t("auth.notConfigured"));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setRootError(authErrorMessage(error, t));
      return;
    }
    finish();
  };

  const sendCode = async () => {
    setRootError(null);
    const email = getValues("email");
    if (!email) {
      setRootError(t("auth.email"));
      return;
    }
    if (!supabaseConfigured) {
      setRootError(t("auth.notConfigured"));
      return;
    }
    setOtpLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setOtpLoading(false);
    if (error) {
      setRootError(authErrorMessage(error, t));
      return;
    }
    setOtpEmail(email);
    setOtpSent(true);
  };

  const verifyCode = async () => {
    setRootError(null);
    setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otpCode.trim(),
      type: "email",
    });
    setOtpLoading(false);
    if (error) {
      setRootError(authErrorMessage(error, t));
      return;
    }
    finish();
  };

  return (
    <Screen scroll keyboard contentContainerClassName="px-6 pb-10">
      <ScreenHeader back />
      <View className="items-center pt-2">
        <Wordmark />
      </View>

      <View className="mt-10">
        <Text className="font-heading text-[30px] leading-9 tracking-tight text-ink dark:text-nzila-sand">
          {t("auth.loginTitle")}
        </Text>
        <Text className="mt-2 font-body text-base leading-6 text-ink-soft dark:text-night-muted">
          {t("auth.loginSubtitle")}
        </Text>
      </View>

      <Card className="mt-7 gap-4 p-5">
        <FormInput
          control={control}
          name="email"
          label={t("auth.email")}
          placeholder="nome@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email?.message}
        />

        {mode === "password" ? (
          <>
            <FormInput
              control={control}
              name="password"
              label={t("auth.password")}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password?.message}
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
            {rootError ? (
              <Text className="font-body text-sm leading-5 text-nzila-red">{rootError}</Text>
            ) : null}
            <Button
              label={isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
              size="lg"
              fullWidth
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
          </>
        ) : (
          <>
            {otpSent ? (
              <>
                <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
                  {t("auth.codeSent", { email: otpEmail })}
                </Text>
                <Input
                  label={t("auth.code")}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                />
                {rootError ? (
                  <Text className="font-body text-sm leading-5 text-nzila-red">{rootError}</Text>
                ) : null}
                <Button
                  label={t("auth.verifyCode")}
                  size="lg"
                  fullWidth
                  loading={otpLoading}
                  onPress={() => void verifyCode()}
                />
              </>
            ) : (
              <>
                <Text className="font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
                  {t("auth.useOtp")}
                </Text>
                {rootError ? (
                  <Text className="font-body text-sm leading-5 text-nzila-red">{rootError}</Text>
                ) : null}
                <Button
                  label={t("auth.sendCode")}
                  size="lg"
                  fullWidth
                  loading={otpLoading}
                  leftIcon={<Mail size={18} color="#FFFFFF" />}
                  onPress={() => void sendCode()}
                />
              </>
            )}
          </>
        )}

        <Pressable
          onPress={() => {
            setRootError(null);
            setOtpSent(false);
            setOtpCode("");
            setMode((value) => (value === "password" ? "otp" : "password"));
          }}
          className="items-center py-1"
        >
          <Text className="font-body-semi text-sm text-nzila-red">
            {mode === "password" ? t("auth.useOtp") : t("auth.usePassword")}
          </Text>
        </Pressable>
      </Card>

      <Pressable onPress={() => router.push("/(auth)/register")} className="mt-6 items-center">
        <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
          {t("auth.noAccount")}
        </Text>
      </Pressable>

      <View className="mt-8 items-center">
        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("common.location")}
        </Text>
      </View>
    </Screen>
  );
}
