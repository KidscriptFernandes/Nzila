import { useState } from "react";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Camera, ImagePlus, MapPin, Trash2 } from "lucide-react-native";
import { PLACE_CATEGORIES, type CreatePlaceInput, type PlaceCategory } from "@nzila/shared";
import { CoordinatePickerMap } from "@/components/CoordinatePickerMap";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, PhoneInput } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useMe } from "@/features/auth/hooks";
import { useCreatePlace } from "@/features/places/hooks";
import { notify } from "@/lib/dialogs";
import { apiErrorMessage } from "@/lib/errors";
import { pickPhotoFromLibrary, type PickedPhoto } from "@/lib/photo";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Coordinate = { lat: number; lng: number };

const PHOTO_ERRORS = {
  permission: "admin.photoPermission",
  invalid: "admin.photoInvalid",
  tooLarge: "admin.photoTooLarge",
  read: "admin.photoReadError",
} as const;

export default function NewPlaceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const me = useMe();
  const create = useCreatePlace();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("PARAGEM");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+244");
  const [mapsUrl, setMapsUrl] = useState("");
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [published, setPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  if (me.isPending || !me.data) return <LoadingScreen />;

  if (me.data.profile.role !== "admin") {
    return (
      <Screen>
        <ScreenHeader back title={t("admin.createTitle")} />
        <ErrorState message={t("admin.adminOnly")} />
      </Screen>
    );
  }

  const choosePhoto = async () => {
    const result = await pickPhotoFromLibrary();
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      notify(t("common.error"), t(PHOTO_ERRORS[result.reason]));
      return;
    }
    setPhoto(result.photo);
  };

  const submit = () => {
    if (name.trim().length < 2) {
      setFormError(t("admin.requiredName"));
      return;
    }
    if (
      !coordinate ||
      !Number.isFinite(coordinate.lat) ||
      !Number.isFinite(coordinate.lng) ||
      Math.abs(coordinate.lat) > 90 ||
      Math.abs(coordinate.lng) > 180
    ) {
      setFormError(t("admin.invalidCoordinates"));
      return;
    }

    setFormError(null);

    const payload: CreatePlaceInput = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      address: address.trim() || null,
      lat: coordinate.lat,
      lng: coordinate.lng,
      phone: phone.trim().length > 4 ? phone.trim() : null,
      googleMapsUrl: mapsUrl.trim() || null,
      published,
      ...(photo ? { photo: { mime: photo.mime, data: photo.base64 } } : {}),
    };

    create.mutate(payload, {
      onSuccess: () => {
        notify(t("admin.created"));
        router.replace("/(admin)/places");
      },
      onError: (error) => notify(t("admin.createError"), apiErrorMessage(error, t)),
    });
  };

  return (
    <Screen scroll keyboard contentContainerClassName="px-5 pb-10">
      <ScreenHeader back title={t("admin.createTitle")} subtitle={t("admin.createSubtitle")} />

      <Card className="gap-4">
        <Input
          label={t("admin.name")}
          value={name}
          onChangeText={setName}
          placeholder={t("admin.namePlaceholder")}
          required
        />

        <View className="gap-2">
          <Text className="font-body-semi text-[13px] text-ink dark:text-nzila-sand">
            {t("admin.category")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PLACE_CATEGORIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                className={cn(
                  "rounded-full border px-3.5 py-2",
                  category === item
                    ? "border-nzila-red bg-nzila-red"
                    : "border-line bg-surface dark:border-night-line dark:bg-coal",
                )}
              >
                <Text
                  className={cn(
                    "font-body-semi text-xs",
                    category === item ? "text-white" : "text-ink-soft dark:text-night-muted",
                  )}
                >
                  {t(`category.${item}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Input
          label={t("admin.address")}
          value={address}
          onChangeText={setAddress}
          placeholder={t("admin.addressPlaceholder")}
        />

        <Input
          label={t("admin.description")}
          value={description}
          onChangeText={setDescription}
          placeholder={t("admin.descriptionPlaceholder")}
          multiline
          maxLength={1000}
        />

        <PhoneInput label={t("admin.phone")} value={phone} onChangeText={setPhone} />

        <Input
          label={t("admin.mapsUrl")}
          value={mapsUrl}
          onChangeText={setMapsUrl}
          placeholder="https://maps.google.com/..."
          autoCapitalize="none"
          keyboardType="url"
        />
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center gap-2">
          <MapPin size={17} color={colors.red} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("admin.location")}
          </Text>
        </View>
        <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
          {t("admin.locationHint")}
        </Text>
        <View className="h-64 overflow-hidden rounded-2xl border border-line dark:border-night-line">
          <CoordinatePickerMap value={coordinate} onPick={setCoordinate} />
        </View>
        {coordinate ? (
          <Text className="font-body text-xs text-ink-soft dark:text-night-muted">
            {t("admin.coordinates", {
              lat: coordinate.lat.toFixed(6),
              lng: coordinate.lng.toFixed(6),
            })}
          </Text>
        ) : null}
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center gap-2">
          <Camera size={17} color={colors.red} />
          <Text className="font-heading-semi text-base text-ink dark:text-nzila-sand">
            {t("admin.photo")}
          </Text>
        </View>

        {photo ? (
          <View className="gap-2">
            <Image
              source={{ uri: photo.uri }}
              resizeMode="cover"
              style={{ width: "100%", height: 180, borderRadius: 16 }}
            />
            <View className="flex-row gap-2">
              <Button
                label={t("admin.changePhoto")}
                variant="outline"
                size="sm"
                onPress={() => void choosePhoto()}
              />
              <Button
                label={t("admin.removePhoto")}
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 size={14} color={colors.red} />}
                textClassName="text-nzila-red"
                onPress={() => setPhoto(null)}
              />
            </View>
          </View>
        ) : (
          <Button
            label={t("admin.addPhoto")}
            variant="outline"
            leftIcon={<ImagePlus size={16} color={colors.text} />}
            onPress={() => void choosePhoto()}
          />
        )}

        <Text className="font-body text-[11px] text-ink-soft dark:text-night-muted">
          {t("admin.photoHint")}
        </Text>
      </Card>

      <Card className="mt-4 gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="font-body-semi text-sm text-ink dark:text-nzila-sand">
              {t("admin.published")}
            </Text>
            <Text className="mt-0.5 font-body text-xs leading-5 text-ink-soft dark:text-night-muted">
              {t("admin.publishHint")}
            </Text>
          </View>
          <Switch
            value={published}
            onValueChange={setPublished}
            trackColor={{ false: colors.line, true: colors.red }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {formError ? (
        <Text className="mt-3 font-body text-xs text-nzila-red">{formError}</Text>
      ) : null}

      <Button
        label={create.isPending ? t("admin.creating") : t("admin.submit")}
        fullWidth
        size="lg"
        className="mt-4"
        loading={create.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
