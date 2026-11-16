import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { roleHome } from "@/features/auth/RoleGuard";
import { useMe } from "@/features/auth/hooks";
import { apiErrorMessage } from "@/lib/errors";
import { hasSeenOnboarding } from "@/lib/onboarding";
import { useSession } from "@/store/session";

export default function Index() {
  const { t } = useTranslation();
  const { session, initialized, signOut } = useSession();
  const me = useMe(initialized && Boolean(session));
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (session) return;
    void hasSeenOnboarding().then(setSeenOnboarding);
  }, [session]);

  if (!initialized) return <LoadingScreen />;

  if (!session) {
    if (seenOnboarding === null) return <LoadingScreen />;
    return <Redirect href={seenOnboarding ? "/(auth)/login" : "/onboarding"} />;
  }

  if (me.isPending) return <LoadingScreen />;

  if (me.isError) {
    return (
      <Screen>
        <ErrorState message={apiErrorMessage(me.error, t)} onRetry={() => void me.refetch()} />
        <Button
          label={t("common.signOut")}
          variant="ghost"
          onPress={() => void signOut()}
          className="mx-6"
        />
      </Screen>
    );
  }

  return <Redirect href={roleHome(me.data.profile.role)} />;
}
