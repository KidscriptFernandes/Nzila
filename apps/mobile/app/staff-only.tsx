import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react-native";
import { NzilaMark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useSession } from "@/store/session";
import { Text, View } from "react-native";

export default function StaffOnly() {
  const { t } = useTranslation();
  const signOut = useSession((state) => state.signOut);

  return (
    <Screen className="items-center justify-center px-6">
      <View className="w-full items-center">
        <NzilaMark size={52} />
        <Card className="mt-8 w-full items-center py-8">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-nzila-ocean-soft dark:bg-nzila-ocean/20">
            <ShieldCheck size={26} color="#0E6F7C" />
          </View>
          <Text className="text-center font-heading text-xl text-ink dark:text-nzila-sand">
            {t("auth.staffTitle")}
          </Text>
          <Text className="mt-2 max-w-[280px] text-center font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
            {t("auth.staffMessage")}
          </Text>
          <Button
            label={t("common.signOut")}
            className="mt-6"
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/login");
            }}
          />
        </Card>
      </View>
    </Screen>
  );
}
