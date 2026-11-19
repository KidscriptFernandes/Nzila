import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageSquareText, Search } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConversationCard } from "@/features/places/components/ConversationCard";
import { usePlaceConversations } from "@/features/places/hooks";
import { apiErrorMessage } from "@/lib/errors";
import { useThemeColors } from "@/lib/theme";

export default function ClientConversationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const conversations = usePlaceConversations(query || undefined);
  const items = useMemo(() => conversations.data?.items ?? [], [conversations.data]);

  return (
    <Screen>
      <ScreenHeader title={t("conversations.title")} subtitle={t("conversations.subtitle")} />

      <View className="w-full max-w-3xl self-center px-5 pb-3">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t("conversations.searchPlaceholder")}
          left={<Search size={17} color={colors.muted} />}
        />
      </View>

      {conversations.isPending ? (
        <View className="w-full max-w-3xl self-center gap-3 px-5 pt-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-[86px] w-full" />
          ))}
        </View>
      ) : conversations.isError ? (
        <ErrorState
          message={apiErrorMessage(conversations.error, t)}
          onRetry={() => void conversations.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.place.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            width: "100%",
            maxWidth: 768,
            alignSelf: "center",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 32,
            gap: 10,
          }}
          refreshing={conversations.isRefetching}
          onRefresh={() => void conversations.refetch()}
          renderItem={({ item }) => (
            <ConversationCard
              conversation={item}
              locale={i18n.language}
              onPress={() =>
                router.push({
                  pathname: "/(client)/place/[id]",
                  params: { id: item.place.id },
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<MessageSquareText size={28} color={colors.red} />}
              title={t(query ? "conversations.noResults" : "conversations.emptyTitle")}
              body={t(query ? "conversations.noResultsBody" : "conversations.emptyBody")}
              actionLabel={t("conversations.explore")}
              onAction={() => router.push("/(client)/(tabs)/map")}
            />
          }
        />
      )}
    </Screen>
  );
}
