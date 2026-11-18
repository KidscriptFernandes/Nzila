import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import {
  ExternalLink,
  ImagePlus,
  MessageCircle,
  Navigation,
  Send,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import type { PlaceDTO, PlaceMessageDTO } from "@nzila/shared";
import { PlaceIcon } from "@/components/PlaceCard";
import { PlacesMap } from "@/components/PlacesMap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  usePlace,
  usePlaceMessages,
  usePlaceRealtime,
  useSendPlaceMessage,
} from "@/features/places/hooks";
import { mediaUrl } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatTime, googleMapsUrl } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";

const PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

type PhotoMime = (typeof PHOTO_MIMES)[number];

function isPhotoMime(value: string): value is PhotoMime {
  return (PHOTO_MIMES as readonly string[]).includes(value);
}

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function PlaceChatScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id: string }>();
  const placeId = paramValue(params.id);
  const currentUserId = useSession((state) => state.session?.user.id);

  const place = usePlace(placeId);
  const messages = usePlaceMessages(placeId);
  const realtime = usePlaceRealtime(placeId);
  const send = useSendPlaceMessage(placeId);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<{
    uri: string;
    mime: PhotoMime;
    base64: string;
  } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const listRef = useRef<FlatList<PlaceMessageDTO>>(null);

  const items = useMemo(() => messages.data?.items ?? [], [messages.data]);
  const suggestions = useMemo(
    () => [
      t("placeChat.suggestRoute"),
      t("placeChat.suggestSafety"),
      t("placeChat.suggestTime"),
    ],
    [t],
  );

  const submit = () => {
    const body = draft.trim();
    if ((!body && !photo) || send.isPending) return;

    send.mutate(
      {
        body,
        ...(photo ? { photo: { mime: photo.mime, data: photo.base64 } } : {}),
      },
      {
        onSuccess: () => {
          setDraft("");
          setPhoto(null);
          setPhotoError(null);
          send.reset();
        },
      },
    );
  };

  const pickPhoto = async () => {
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(t("placeChat.photoPermission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.base64) {
        setPhotoError(t("placeChat.photoError"));
        return;
      }

      const mime = asset.mimeType ?? "image/jpeg";
      if (!isPhotoMime(mime)) {
        setPhotoError(t("placeChat.photoError"));
        return;
      }

      const bytes = Math.ceil((asset.base64.length * 3) / 4);
      if (bytes > 2 * 1024 * 1024) {
        setPhotoError(t("placeChat.photoTooLarge"));
        return;
      }

      setPhoto({ uri: asset.uri, mime, base64: asset.base64 });
    } catch {
      setPhotoError(t("placeChat.photoError"));
    }
  };

  const openMaps = (item: PlaceDTO) => {
    void Linking.openURL(
      item.googleMapsUrl ?? googleMapsUrl(item.lat, item.lng, item.name),
    );
  };

  if (!placeId) {
    return (
      <Screen>
        <ScreenHeader back title={t("placeChat.title")} />
        <ErrorState message={t("placeChat.notFound")} />
      </Screen>
    );
  }

  if (place.isPending) {
    return (
      <Screen>
        <ScreenHeader back title={t("placeChat.title")} />
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      </Screen>
    );
  }

  if (place.isError || !place.data) {
    return (
      <Screen>
        <ScreenHeader back title={t("placeChat.title")} />
        <ErrorState
          message={apiErrorMessage(place.error, t)}
          onRetry={() => void place.refetch()}
        />
      </Screen>
    );
  }

  const selected = place.data;

  return (
    <Screen keyboard edges={["top", "left", "right", "bottom"]}>
      <ScreenHeader
        back
        title={selected.name}
        subtitle={t("placeChat.subtitle")}
        right={<ConnectionBadge connected={realtime.connected} />}
      />

      <View className="px-5">
        {selected.photoUrl ? (
          <Image
            source={{ uri: mediaUrl(selected.photoUrl) }}
            resizeMode="cover"
            style={{ width: "100%", height: 180, borderRadius: 16, marginBottom: 12 }}
          />
        ) : null}
        <View className="h-40 overflow-hidden rounded-2xl border border-line dark:border-night-line">
          <PlacesMap
            places={[selected]}
            selectedId={selected.id}
            onSelect={() => undefined}
          />
        </View>

        <View className="mt-3 flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-nzila-sand dark:bg-night-line">
            <PlaceIcon category={selected.category} color={colors.red} />
          </View>
          <View className="flex-1">
            <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
              {selected.address ?? t(`category.${selected.category}`)}
            </Text>
            {selected.description ? (
              <Text
                className="mt-1 font-body text-xs leading-4 text-ink-soft dark:text-night-muted"
                numberOfLines={2}
              >
                {selected.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <Button
            label={t("map.openMaps")}
            variant="outline"
            size="sm"
            leftIcon={<ExternalLink size={14} color={colors.text} />}
            onPress={() => openMaps(selected)}
          />
          <Button
            label={t("map.requestRide")}
            size="sm"
            leftIcon={<Navigation size={14} color="#FFFFFF" />}
            onPress={() =>
              router.push({
                pathname: "/(client)/ride/new",
                params: {
                  destination: selected.name,
                  destinationLat: String(selected.lat),
                  destinationLng: String(selected.lng),
                },
              })
            }
          />
        </View>
      </View>

      <View className="mt-4 flex-1">
        <View className="flex-row items-center gap-2 px-5 pb-2">
          <MessageCircle size={16} color={colors.red} />
          <Text className="flex-1 font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("placeChat.communityTitle")}
          </Text>
          <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
            {items.length}
          </Text>
        </View>

        {messages.isPending ? (
          <View className="gap-3 px-5 pt-2">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-2/3 self-end" />
            <Skeleton className="h-16 w-4/5" />
          </View>
        ) : messages.isError ? (
          <ErrorState
            message={apiErrorMessage(messages.error, t)}
            onRetry={() => void messages.refetch()}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => item.id}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={messages.isRefetching}
                onRefresh={() => void messages.refetch()}
                tintColor={colors.red}
              />
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: items.length > 1 })
            }
            ListEmptyComponent={
              <View className="items-center px-6 py-10">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nzila-gold-soft dark:bg-night-line">
                  <MessageCircle size={26} color={colors.gold} />
                </View>
                <Text className="text-center font-heading-semi text-lg text-ink dark:text-nzila-sand">
                  {t("placeChat.emptyTitle")}
                </Text>
                <Text className="mt-2 max-w-[280px] text-center font-body text-sm leading-5 text-ink-soft dark:text-night-muted">
                  {t("placeChat.emptyBody")}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                own={item.authorId === currentUserId}
                time={formatTime(item.createdAt, i18n.language)}
              />
            )}
          />
        )}
      </View>

      <View className="border-t border-line bg-canvas px-5 pb-2 pt-2 dark:border-night-line dark:bg-night">
        {photo ? (
          <View className="mb-2 flex-row items-center gap-2">
            <Image
              source={{ uri: photo.uri }}
              style={{ width: 64, height: 64, borderRadius: 12 }}
            />
            <Pressable
              onPress={() => setPhoto(null)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal"
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}

        <View className="mb-2 flex-row flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => setDraft(suggestion)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 active:opacity-70 dark:border-night-line dark:bg-coal"
            >
              <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => void pickPhoto()}
            disabled={send.isPending}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface active:opacity-70 dark:border-night-line dark:bg-coal"
          >
            <ImagePlus size={18} color={colors.muted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("placeChat.placeholder")}
            placeholderTextColor={colors.muted}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={submit}
            className="h-11 flex-1 rounded-2xl border border-line bg-surface px-4 font-body text-sm text-ink dark:border-night-line dark:bg-coal dark:text-nzila-sand"
          />
          <Button
            label={t("common.send")}
            size="sm"
            loading={send.isPending}
            disabled={!draft.trim() && !photo}
            leftIcon={<Send size={14} color="#FFFFFF" />}
            onPress={submit}
          />
        </View>

        {photoError ? (
          <Text className="mt-1 font-body text-[11px] text-nzila-red">{photoError}</Text>
        ) : null}

        {send.isError ? (
          <Text className="mt-1 font-body text-[11px] text-nzila-red">
            {apiErrorMessage(send.error, t)}
          </Text>
        ) : (
          <Text className="mt-1 font-body text-[10px] text-ink-soft dark:text-night-muted">
            {t("placeChat.hint")}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function MessageBubble({
  message,
  own,
  time,
}: {
  message: PlaceMessageDTO;
  own: boolean;
  time: string;
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
      className={cn(
        "max-w-[86%] gap-1",
        own ? "items-end self-end" : "items-start self-start",
      )}
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
              width: 230,
              height: 170,
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

function ConnectionBadge({ connected }: { connected: boolean }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 dark:border-night-line dark:bg-coal">
      {connected ? (
        <Wifi size={12} color="#2E7D4F" />
      ) : (
        <WifiOff size={12} color="#9C3A24" />
      )}
      <Text className="font-body text-[10px] text-ink-soft dark:text-night-muted">
        {connected ? t("placeChat.live") : t("placeChat.connecting")}
      </Text>
      {!connected ? <ActivityIndicator size={10} color="#9C3A24" /> : null}
    </View>
  );
}
