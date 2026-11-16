import { Redirect, Stack } from "expo-router";
import { roleHome } from "@/features/auth/RoleGuard";
import { useMe } from "@/features/auth/hooks";
import { useSession } from "@/store/session";

export default function AuthLayout() {
  const session = useSession((state) => state.session);
  const me = useMe(Boolean(session));

  if (session && me.data) {
    return <Redirect href={roleHome(me.data.profile.role)} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
