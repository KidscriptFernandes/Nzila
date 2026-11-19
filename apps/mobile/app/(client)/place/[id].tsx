import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  MessageCircle,
  Send,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import type { PlaceDTO, PlaceMessageDTO } from "@nzila/shared";
import { PlaceIcon } from "@/components/PlaceCard";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlaceChatMessage } from "@/features/places/components/PlaceChatMessage";
import { PlaceInfoPanel } from "@/features/places/components/PlaceInfoPanel";
import {
  usePlace,
  usePlaceMessages,
  usePlaceRealtime,
  useSendPlaceMessage,
} from "@/features/places/hooks";
import { mediaUrl } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { formatTime, googleMapsUrl } from "@/lib/format";
import { useResponsive } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme";
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
  const { isCompact, isDesktop } = useResponsive();
  const params = useLocalSearchParams<{ id: string }>();
  const placeId = paramValue(params.id);
  const currentUserId = useSession((state) => state.session?.user.id);

  const place = usePlace(placeId);
  const messages = usePlaceMessages(placeId);
  const realtime = usePlaceRealtime(placeId);
  const send = useSendPlaceMessage(placeId);
  const [draft, setDraft] = useState("");
  const [showDetails, setShowDetails] = useState(false);
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

  const requestRide = () =>
    router.push({
      pathname: "/(client)/ride/new",
      params: {
        destination: selected.name,
        destinationLat: String(selected.lat),
        destinationLng: String(selected.lng),
      },
    });

  const chatList = (
    <View className="min-h-0 flex-1">
      <View className="flex-row items-center gap-2 px-5 pb-2">
        <MessageCircle size={16} color={colors.red} />
        <Text className="flex-1 font-heading-semi text-base text-ink dark:text-nzila-sand">
          {t("placeChat.communityTitle")}
        </Text>
        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("placeChat.messageCount", { count: items.length })}
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
          style={{ minHeight: 0 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: isCompact ? 20 : 28,
            paddingVertical: 12,
            gap: 14,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={messages.isRefetching}
          onRefresh={() => void messages.refetch()}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: items.length > 1 })
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6 py-10">
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
            <PlaceChatMessage
              message={item}
              own={item.authorId === currentUserId}
              time={formatTime(item.createdAt, i18n.language)}
              compact={isCompact}
            />
          )}
        />
      )}
    </View>
  );

  const composer = (
    <View className="border-t border-line bg-canvas px-3 pb-2 pt-2 dark:border-night-line dark:bg-night">
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

      {!isCompact ? (
        <View className="mb-2 flex-row flex-wrap gap-2 px-2">
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
      ) : null}

      <View className="flex-row items-center gap-2 px-2">
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
          label={isCompact ? "" : t("common.send")}
          size="sm"
          loading={send.isPending}
          disabled={!draft.trim() && !photo}
          accessibilityLabel={t("common.send")}
          leftIcon={<Send size={14} color="#FFFFFF" />}
          onPress={submit}
        />
      </View>

      {photoError ? (
        <Text className="mt-1 px-2 font-body text-[11px] text-nzila-red">{photoError}</Text>
      ) : null}

      {send.isError ? (
        <Text className="mt-1 px-2 font-body text-[11px] text-nzila-red">
          {apiErrorMessage(send.error, t)}
        </Text>
      ) : (
        <Text className="mt-1 px-2 font-body text-[10px] text-ink-soft dark:text-night-muted">
          {t("placeChat.hint")}
        </Text>
      )}
    </View>
  );

  return (
    <Screen keyboard edges={["top", "left", "right", "bottom"]}>
      <View className="w-full flex-1 self-center" style={{ maxWidth: 1280 }}>
        {isDesktop ? (
          <View className="flex-1 flex-row">
            <View className="w-[360px] border-r border-line dark:border-night-line">
              <ScreenHeader
                back
                title={selected.name}
                subtitle={t("placeChat.subtitle")}
                right={<ConnectionBadge connected={realtime.connected} />}
              />
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                <PlaceInfoPanel
                  place={selected}
                  onOpenMaps={() => openMaps(selected)}
                  onRequestRide={requestRide}
                />
              </ScrollView>
            </View>

            <View className="flex-1" style={{ minHeight: 0 }}>
              {chatList}
              {composer}
            </View>
          </View>
        ) : (
          <View className="flex-1">
            <ScreenHeader
              back
              title={selected.name}
              subtitle={t("placeChat.subtitle")}
              right={<ConnectionBadge connected={realtime.connected} />}
            />

            <Pressable
              onPress={() => setShowDetails((current) => !current)}
              className="mx-5 flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 active:opacity-80 dark:border-night-line dark:bg-coal"
            >
              {selected.photoUrl ? (
                <Image
                  source={{ uri: mediaUrl(selected.photoUrl) }}
                  resizeMode="cover"
                  style={{ width: 44, height: 44, borderRadius: 12 }}
                />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-nzila-sand dark:bg-night-line">
                  <PlaceIcon category={selected.category} color={colors.red} />
                </View>
              )}
              <View className="flex-1">
                <Text className="font-body-semi text-xs text-ink dark:text-nzila-sand">
                  {t("placeChat.detailsTitle")}
                </Text>
                <Text
                  className="mt-0.5 font-body text-[11px] text-ink-soft dark:text-night-muted"
                  numberOfLines={1}
                >
                  {selected.address ?? t(`category.${selected.category}`)}
                </Text>
              </View>
              {showDetails ? (
                <ChevronUp size={18} color={colors.muted} />
              ) : (
                <ChevronDown size={18} color={colors.muted} />
              )}
            </Pressable>

            {showDetails ? (
              <View className="mt-2" style={{ maxHeight: 330 }}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  <PlaceInfoPanel
                    compact
                    place={selected}
                    onOpenMaps={() => openMaps(selected)}
                    onRequestRide={requestRide}
                  />
                </ScrollView>
              </View>
            ) : null}

            <View className="mt-2 min-h-0 flex-1">
              {chatList}
              {composer}
            </View>
          </View>
        )}
      </View>
    </Screen>
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
