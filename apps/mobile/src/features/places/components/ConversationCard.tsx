import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MessageSquareText } from "lucide-react-native";
import type { PlaceConversationDTO } from "@nzila/shared";
import { PlaceIcon } from "@/components/PlaceCard";
import { Badge } from "@/components/ui/Badge";
import { mediaUrl } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

export function ConversationCard({
  conversation,
  locale,
  onPress,
}: {
  conversation: PlaceConversationDTO;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { place, lastMessage, messageCount } = conversation;
  const preview = lastMessage.body || t("conversations.photoPreview");

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 active:opacity-80 dark:border-night-line dark:bg-coal"
    >
      {place.photoUrl ? (
        <Image
          source={{ uri: mediaUrl(place.photoUrl) }}
          resizeMode="cover"
          style={{ width: 52, height: 52, borderRadius: 16 }}
        />
      ) : (
        <View className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-nzila-sand dark:bg-night-line">
          <PlaceIcon category={place.category} size={22} color={colors.red} />
        </View>
      )}

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 font-body-semi text-sm text-ink dark:text-nzila-sand"
            numberOfLines={1}
          >
            {place.name}
          </Text>
          <Text className="font-body text-[10px] text-ink-soft dark:text-night-muted">
            {formatTime(lastMessage.createdAt, locale)}
          </Text>
        </View>
        <Text
          className="font-body text-xs leading-4 text-ink-soft dark:text-night-muted"
          numberOfLines={2}
        >
          <Text className="font-body-semi">{lastMessage.authorName}: </Text>
          {preview}
        </Text>
        <View className="flex-row items-center gap-2">
          <Badge
            tone="neutral"
            label={t(`category.${place.category}`)}
            className="px-2 py-0.5"
            textClassName="text-[9px]"
          />
          <View className="flex-row items-center gap-1">
            <MessageSquareText size={11} color={colors.muted} />
            <Text className="font-body text-[10px] text-ink-soft dark:text-night-muted">
              {t("conversations.messageCount", { count: messageCount })}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
