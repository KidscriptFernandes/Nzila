import { Stack } from "expo-router";
import { RoleGuard } from "@/features/auth/RoleGuard";

export default function DriverLayout() {
  return (
    <RoleGuard role="driver">
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </RoleGuard>
  );
}
