import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen className="items-center justify-center px-6">
      <View className="items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nzila-gold-soft dark:bg-night-line">
          <Compass size={30} color="#B8860B" />
        </View>
        <Text className="font-heading text-xl text-ink dark:text-nzila-sand">
          Página não encontrada
        </Text>
        <Text className="mt-2 text-center font-body text-sm text-ink-soft dark:text-night-muted">
          O caminho que seguiste já não existe.
        </Text>
        <Button label="Voltar ao início" className="mt-6" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}
