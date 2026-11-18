import { Stack } from "expo-router";
import { RoleGuard } from "@/features/auth/RoleGuard";

export default function ClientLayout() {
  return (
    <RoleGuard role="client">
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </RoleGuard>
  );
}
