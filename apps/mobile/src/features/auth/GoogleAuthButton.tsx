import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Button } from "@/components/ui/Button";
import { GoogleAuthNotConfiguredError } from "@/lib/auth-google";
import { apiErrorMessage } from "@/lib/errors";
import { queryClient } from "@/lib/query";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";

export function GoogleAuthButton({
  disabled,
  onError,
}: {
  disabled?: boolean;
  onError: (message: string | null) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const signInWithGoogle = useSession((state) => state.signInWithGoogle);
  const language = useSettings((state) => state.language);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    onError(null);
    setLoading(true);
    try {
      const session = await signInWithGoogle(language);
      if (!session) return;
      queryClient.clear();
      router.replace("/");
    } catch (error) {
      if (error instanceof GoogleAuthNotConfiguredError) {
        onError(t("auth.notConfigured"));
      } else {
        onError(apiErrorMessage(error, t));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line dark:bg-night-line" />
        <Text className="font-body text-xs uppercase tracking-wider text-ink-soft dark:text-night-muted">
          {t("auth.or")}
        </Text>
        <View className="h-px flex-1 bg-line dark:bg-night-line" />
      </View>

      <Button
        label={loading ? t("auth.googleSigningIn") : t("auth.continueWithGoogle")}
        variant="outline"
        size="lg"
        fullWidth
        loading={loading}
        disabled={disabled}
        leftIcon={<GoogleIcon size={18} />}
        onPress={() => void handlePress()}
      />
    </View>
  );
}

