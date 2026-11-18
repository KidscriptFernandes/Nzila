import { Stack } from "expo-router";
import { RoleGuard } from "@/features/auth/RoleGuard";

export default function AdminLayout() {
  return (
    <RoleGuard role={["admin", "assistant"]}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </RoleGuard>
  );
}
