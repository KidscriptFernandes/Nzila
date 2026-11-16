import type { ReactNode } from "react";
import type { Href } from "expo-router";
import { Redirect } from "expo-router";
import type { Role } from "@nzila/shared";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { apiErrorMessage } from "@/lib/errors";
import { useSession } from "@/store/session";
import { useMe } from "./hooks";

export function roleHome(role: Role): Href {
  if (role === "driver") return "/(driver)";
  if (role === "client") return "/(client)";
  return "/staff-only";
}

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { t } = useTranslation();
  const { session, initialized, signOut } = useSession();
  const me = useMe(initialized && Boolean(session));

  if (!initialized) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  if (me.isPending) return <LoadingScreen />;

  if (me.isError) {
    return (
      <Screen>
        <ErrorState
          message={apiErrorMessage(me.error, t)}
          onRetry={() => void me.refetch()}
        />
        <Button
          label={t("common.signOut")}
          variant="ghost"
          onPress={() => void signOut()}
          className="mx-6"
        />
      </Screen>
    );
  }

  if (me.data.profile.role !== role) {
    return <Redirect href={roleHome(me.data.profile.role)} />;
  }

  return <>{children}</>;
}
