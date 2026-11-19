import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { FileText, History, Inbox, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme";

export default function DriverTabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 4,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.invites"),
          tabBarIcon: ({ color, focused }) => (
            <Inbox size={22} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("driver.history"),
          tabBarIcon: ({ color, focused }) => (
            <History size={22} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: t("nav.documents"),
          tabBarIcon: ({ color, focused }) => (
            <FileText size={22} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color, focused }) => (
            <UserRound size={22} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
    </Tabs>
  );
}
