import { Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PlaceMessageDTO } from "@nzila/shared";
import { Avatar } from "@/components/ui/Avatar";
import { mediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function PlaceChatMessage({
  message,
  own,
  time,
  compact,
}: {
  message: PlaceMessageDTO;
  own: boolean;
  time: string;
  compact: boolean;
}) {
  const { t } = useTranslation();

  const roleLabel =
    message.authorRole === "assistant"
      ? t("placeChat.roleAssistant")
      : message.authorRole === "admin"
        ? t("placeChat.roleAdmin")
        : message.authorRole === "driver"
          ? t("placeChat.roleDriver")
          : null;

  return (
    <View
      className={cn("gap-1", own ? "items-end self-end" : "items-start self-start")}
      style={{ maxWidth: compact ? "86%" : 540 }}
    >
      {!own ? (
        <View className="flex-row items-center gap-2 pl-1">
          <Avatar name={message.authorName} size={26} />
          <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
            {message.authorName}
          </Text>
          {roleLabel ? (
            <Text className="font-body text-[10px] text-nzila-red dark:text-nzila-gold">
              {roleLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        className={cn(
          "rounded-2xl px-4 py-2.5",
          own
            ? "rounded-br-md bg-nzila-red"
            : "rounded-bl-md border border-line bg-surface dark:border-night-line dark:bg-coal",
        )}
      >
        {message.photoUrl ? (
          <Image
            source={{ uri: mediaUrl(message.photoUrl) }}
            resizeMode="cover"
            style={{
              width: compact ? 220 : 300,
              maxWidth: "100%",
              aspectRatio: 4 / 3,
              borderRadius: 12,
              marginBottom: message.body ? 8 : 0,
            }}
          />
        ) : null}
        {message.body ? (
          <Text
            className={cn(
              "font-body text-sm leading-5",
              own ? "text-white" : "text-ink dark:text-nzila-sand",
            )}
          >
            {message.body}
          </Text>
        ) : null}
      </View>

      <Text className="px-1 font-body text-[10px] text-ink-soft dark:text-night-muted">
        {time}
      </Text>
    </View>
  );
}
